"""Modelos ML — classificadores, métricas, ROC e importância de features."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st
from sklearn.metrics import (
    confusion_matrix, ConfusionMatrixDisplay,
    accuracy_score, f1_score, precision_score, recall_score,
    roc_curve, auc, precision_recall_curve,
)
from sklearn.preprocessing import label_binarize

from utils.db import get_relatos
from utils.modelos import loocv_classificadores, metricas_classificacao

st.set_page_config(page_title='Modelos ML · SIMA', layout='wide')

CORES_ROC = ['#ef4444', '#10b981', '#f59e0b']

# ──────────────────────────────────────────────────────────────────────────────
# Dados e treinamento
# ──────────────────────────────────────────────────────────────────────────────
st.title('Modelos de Classificação')
st.caption(
    'Árvore de Decisão e Regressão Logística treinadas com Leave-One-Out Cross-Validation (LOOCV) '
    'para classificar o nível de risco (baixo / médio / alto). Análise correspondente ao notebook CC5.'
)

try:
    df = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

n = len(df)
st.markdown(
    f'**Base:** {n} relatos · features usadas: `hora`, `bairro` · '
    'método de validação: Leave-One-Out (LOOCV)'
)

if n < 10:
    st.warning(
        f'Apenas {n} relatos disponíveis. Resultados com N tão pequeno têm alta variância '
        'e devem ser interpretados com cautela. '
        'Execute `ml/scripts/gerar_dados_historicos.py` para adicionar dados simulados.'
    )

with st.spinner('Treinando modelos com LOOCV...'):
    resultado = loocv_classificadores(df)

if resultado is None:
    st.error('Dados insuficientes para treinar os classificadores (mínimo: 5 amostras com bairro).')
    st.stop()

le_nivel   = resultado['le_nivel']
y          = resultado['y']
y_pred_dt  = resultado['y_pred_dt']
y_pred_lr  = resultado['y_pred_lr']
y_score_dt = resultado['y_score_dt']
y_score_lr = resultado['y_score_lr']
dt_full    = resultado['dt_full']
classes    = le_nivel.classes_
n_classes  = len(classes)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Matrizes de confusão
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Matrizes de Confusão (LOOCV)')

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
for ax, preds, titulo in zip(
    axes,
    [y_pred_dt, y_pred_lr],
    ['Árvore de Decisão (max_depth=3)', 'Regressão Logística'],
):
    cm = confusion_matrix(y, preds)
    ConfusionMatrixDisplay(cm, display_labels=classes).plot(ax=ax, colorbar=False, cmap='Blues')
    row_sums = cm.sum(axis=1, keepdims=True)
    cm_pct   = np.divide(cm.astype(float), row_sums, where=row_sums != 0) * 100
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i + 0.35, f'({cm_pct[i,j]:.0f}%)',
                    ha='center', va='center', fontsize=8, color='gray')
    ax.set_title(titulo, fontsize=12, fontweight='bold')

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

st.info(
    '**Leitura:** cada célula mostra a contagem absoluta e, em cinza, o percentual '
    'em relação ao total da linha (classe real). A diagonal principal representa acertos.'
)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Comparação de métricas
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Comparação de Métricas (LOOCV)')

metricas_dt = metricas_classificacao(y, y_pred_dt)
metricas_lr = metricas_classificacao(y, y_pred_lr)
df_metricas = pd.DataFrame(
    [metricas_dt, metricas_lr],
    index=['Árvore de Decisão', 'Regressão Logística'],
)
st.dataframe(df_metricas.style.format('{:.4f}').highlight_max(axis=0, color='#d1fae5'))

fig, ax = plt.subplots(figsize=(10, 4))
df_metricas.T.plot(kind='bar', ax=ax, color=['#2563eb', '#10b981'], edgecolor='white', width=0.6)
ax.set_ylim(0, 1.25)
ax.set_xticklabels(df_metricas.columns, rotation=20, ha='right')
baseline_majoritario = (y == le_nivel.transform(['alto'])[0]).mean()
ax.axhline(1 / n_classes, color='gray',   linestyle=':',  linewidth=1.2,
           label=f'Baseline aleatório ({1/n_classes:.0%})')
ax.axhline(baseline_majoritario, color='orange', linestyle='--', linewidth=1.2,
           label=f'Baseline majoritário ({baseline_majoritario:.0%})')
ax.set_title('Métricas dos Classificadores — LOOCV', fontsize=12, fontweight='bold')
ax.legend(bbox_to_anchor=(1.01, 1))
plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

st.info(
    f'**Baseline majoritário:** classificar tudo como "alto" acertaria '
    f'{baseline_majoritario:.0%} dos casos. Os classificadores precisam superar '
    'esse baseline para serem úteis em produção.'
)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Curvas ROC
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Curvas ROC (One-vs-Rest)')

y_bin = label_binarize(y, classes=list(range(n_classes)))

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
for ax, y_score, titulo in zip(
    axes,
    [y_score_dt, y_score_lr],
    ['ROC — Árvore de Decisão', 'ROC — Regressão Logística'],
):
    for i, (nome, cor) in enumerate(zip(classes, CORES_ROC)):
        if i >= y_score.shape[1]:
            continue
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_score[:, i])
        roc_auc     = auc(fpr, tpr)
        n_pos       = int(y_bin[:, i].sum())
        ax.plot(fpr, tpr, color=cor, linewidth=2,
                label=f'{nome.capitalize()} (AUC={roc_auc:.2f}, n={n_pos})')
    ax.plot([0, 1], [0, 1], 'k--', linewidth=1, label='Aleatório (AUC=0.5)')
    ax.set_title(titulo, fontsize=12, fontweight='bold')
    ax.set_xlabel('Taxa de Falsos Positivos (FPR)')
    ax.set_ylabel('Taxa de Verdadeiros Positivos (TPR)')
    ax.legend(fontsize=9)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.05)

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

st.info(
    '**Atenção:** AUC de classes com N pequeno (baixo, médio) tem alta variância. '
    'Interpretar com cautela — os intervalos de confiança seriam amplos com estes dados.'
)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Curvas Precision-Recall
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Curvas Precision-Recall')

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
for ax, y_score, titulo in zip(
    axes,
    [y_score_dt, y_score_lr],
    ['P-R — Árvore de Decisão', 'P-R — Regressão Logística'],
):
    for i, (nome, cor) in enumerate(zip(classes, CORES_ROC)):
        if i >= y_score.shape[1]:
            continue
        prec, rec, _ = precision_recall_curve(y_bin[:, i], y_score[:, i])
        ap           = auc(rec, prec)
        baseline     = y_bin[:, i].mean()
        ax.plot(rec, prec, color=cor, linewidth=2,
                label=f'{nome.capitalize()} (AP={ap:.2f})')
        ax.axhline(baseline, color=cor, linewidth=0.8, linestyle=':')
    ax.set_title(titulo, fontsize=12, fontweight='bold')
    ax.set_xlabel('Recall')
    ax.set_ylabel('Precisão')
    ax.legend(fontsize=8)
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(0, 1.05)

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

st.caption('Linhas pontilhadas = baseline de precisão (proporção real da classe no dataset).')

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Importância de features
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Importância de Features — Árvore de Decisão')

importancias = pd.Series(dt_full.feature_importances_, index=['hora', 'bairro']).sort_values()

fig, ax = plt.subplots(figsize=(7, 3))
cores_imp = ['#ef4444' if v == importancias.max() else '#2563eb' for v in importancias]
bars = ax.barh(importancias.index, importancias.values, color=cores_imp, edgecolor='white')
for bar, val in zip(bars, importancias.values):
    ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height() / 2,
            f'{val:.3f}', va='center', fontweight='bold')
ax.set_title('Importância (Gini) — treinamento no dataset completo',
             fontsize=11, fontweight='bold')
ax.set_xlabel('Importância')
plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

feature_top = importancias.idxmax()
st.info(
    f'**Insight:** `{feature_top}` é a feature dominante. '
    'O modelo aprende que certos bairros quase sempre têm nível alto, '
    'usando isso como regra principal de classificação. '
    'Com N pequeno, esse comportamento é esperado (memorização de padrão geográfico). '
    'Com mais dados, features temporais e de engajamento (confirmações/denúncias) '
    'devem ganhar importância relativa.'
)
