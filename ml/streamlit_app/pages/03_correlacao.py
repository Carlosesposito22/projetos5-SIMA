"""Regressão — correlação entre variáveis e modelos de regressão linear."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import matplotlib.pyplot as plt
import scipy.stats as stats
import streamlit as st

from utils.db import get_relatos
from utils.modelos import MAP_COR, regressao_simples

st.set_page_config(page_title='Regressão · SIMA', layout='wide')

# ──────────────────────────────────────────────────────────────────────────────
# Dados
# ──────────────────────────────────────────────────────────────────────────────
st.title('Regressão Linear')

try:
    df = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

n = len(df)
st.markdown(f'**Base de dados:** {n} relatos · período: '
            f'{df["created_at"].min().date()} → {df["created_at"].max().date()}')

if n < 10:
    st.warning(
        f'Apenas {n} relatos disponíveis. Análises de regressão requerem pelo menos 10 amostras. '
        'Execute `ml/scripts/gerar_dados_historicos.py` para adicionar dados simulados.'
    )

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Regressão 1: Hora → Nível
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Regressão 1 — Hora do Dia → Nível de Severidade')

res_hora = regressao_simples(df, 'hora')

if res_hora is None:
    st.warning('Dados insuficientes para regressão hora × nível.')
else:
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))

    cores_scatter = [MAP_COR.get(n, '#94a3b8') for n in df.dropna(subset=['nivel_num', 'hora'])['nivel']]
    df_v = df.dropna(subset=['nivel_num', 'hora'])
    axes[0].scatter(
        df_v['hora'], df_v['nivel_num'],
        c=cores_scatter, s=60, edgecolors='white', alpha=0.8, zorder=3,
    )
    x_line = np.linspace(df_v['hora'].min(), df_v['hora'].max(), 100).reshape(-1, 1)
    axes[0].plot(
        x_line, res_hora['reg'].predict(x_line),
        color='#1d4ed8', linewidth=2,
        label=f'R²={res_hora["r2"]:.3f}  r={res_hora["r"]:.3f}  p={res_hora["p"]:.3f}',
    )
    axes[0].set_yticks([1, 2, 3])
    axes[0].set_yticklabels(['Baixo', 'Médio', 'Alto'])
    axes[0].set_title('Nível vs. Hora do Dia', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Hora')
    axes[0].set_ylabel('Nível')
    axes[0].legend(fontsize=8)

    axes[1].scatter(
        res_hora['y_pred'], res_hora['residuos'],
        color='#7c3aed', alpha=0.6, s=50, edgecolors='white',
    )
    axes[1].axhline(0, color='black', linewidth=1.5, linestyle='--')
    axes[1].set_title('Resíduos vs. Valores Ajustados', fontsize=12, fontweight='bold')
    axes[1].set_xlabel('Valor Previsto')
    axes[1].set_ylabel('Resíduo')

    residuos_b = [r for r in res_hora['residuos'] if r >= 0]
    residuos_r = [r for r in res_hora['residuos'] if r < 0]
    axes[2].bar(range(len(residuos_b)), residuos_b, color='#10b981', label='Positivo')
    axes[2].bar(
        range(len(residuos_b), len(residuos_b) + len(residuos_r)),
        residuos_r, color='#ef4444', label='Negativo',
    )
    axes[2].axhline(0, color='black', linewidth=1)
    axes[2].set_title('Distribuição dos Resíduos', fontsize=12, fontweight='bold')
    axes[2].set_xlabel('Índice')
    axes[2].set_ylabel('Resíduo')
    axes[2].legend()

    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    col_m1, col_m2, col_m3, col_m4 = st.columns(4)
    col_m1.metric('R²', f'{res_hora["r2"]:.4f}')
    col_m2.metric('RMSE', f'{res_hora["rmse"]:.4f}')
    col_m3.metric('Pearson r', f'{res_hora["r"]:.3f}')
    col_m4.metric('p-valor', f'{res_hora["p"]:.3f}')

    if res_hora['p'] > 0.05:
        st.info(
            '**Interpretação:** A relação entre hora e nível **não é estatisticamente '
            f'significativa** (p = {res_hora["p"]:.3f} > 0,05) com os dados atuais. '
            'O R² baixo confirma que a hora do dia isoladamente não explica o nível do relato — '
            'esperado, pois o nível depende mais da intensidade da chuva e do bairro. '
            'Mais dados são necessários para conclusões robustas.'
        )
    else:
        st.info(
            f'**Interpretação:** Relação estatisticamente significativa (p = {res_hora["p"]:.3f} ≤ 0,05). '
            f'Coeficiente angular: {res_hora["coef"]:+.4f} (cada hora a mais associa-se a '
            f'{abs(res_hora["coef"]):.4f} de variação no nível ordinal).'
        )

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Regressão 2: Latitude → Nível
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Regressão 2 — Latitude → Nível de Severidade')
st.caption('Avalia se bairros mais ao norte/sul do Recife têm alagamentos mais severos.')

res_lat = regressao_simples(df, 'lat')

if res_lat is None:
    st.warning('Dados insuficientes para regressão latitude × nível.')
else:
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))

    df_v2 = df.dropna(subset=['nivel_num', 'lat'])
    cores2 = [MAP_COR.get(n, '#94a3b8') for n in df_v2['nivel']]
    axes[0].scatter(
        df_v2['lat'], df_v2['nivel_num'],
        c=cores2, s=60, edgecolors='white', alpha=0.8, zorder=3,
    )
    x_line2 = np.linspace(df_v2['lat'].min(), df_v2['lat'].max(), 100).reshape(-1, 1)
    axes[0].plot(
        x_line2, res_lat['reg'].predict(x_line2),
        color='#1d4ed8', linewidth=2,
        label=f'R²={res_lat["r2"]:.3f}  r={res_lat["r"]:.3f}  p={res_lat["p"]:.3f}',
    )
    axes[0].set_yticks([1, 2, 3])
    axes[0].set_yticklabels(['Baixo', 'Médio', 'Alto'])
    axes[0].set_title('Nível vs. Latitude', fontsize=12, fontweight='bold')
    axes[0].set_xlabel('Latitude')
    axes[0].set_ylabel('Nível')
    axes[0].legend(fontsize=8)

    stats.probplot(res_lat['residuos'], dist='norm', plot=axes[1])
    axes[1].set_title('QQ-Plot dos Resíduos', fontsize=12, fontweight='bold')
    axes[1].get_lines()[0].set(color='#2563eb', markersize=4, alpha=0.7)
    axes[1].get_lines()[1].set(color='#ef4444', linewidth=2)

    axes[2].hist(res_lat['residuos'], bins=8, color='#7c3aed', edgecolor='white', alpha=0.8)
    axes[2].axvline(0, color='black', linewidth=1.5, linestyle='--')
    axes[2].set_title('Histograma dos Resíduos', fontsize=12, fontweight='bold')
    axes[2].set_xlabel('Resíduo')
    axes[2].set_ylabel('Frequência')

    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    col_m1, col_m2, col_m3, col_m4 = st.columns(4)
    col_m1.metric('R²', f'{res_lat["r2"]:.4f}')
    col_m2.metric('RMSE', f'{res_lat["rmse"]:.4f}')
    col_m3.metric('Pearson r', f'{res_lat["r"]:.3f}')
    col_m4.metric('p-valor', f'{res_lat["p"]:.3f}')

    st.info(
        '**Interpretação:** O QQ-Plot e histograma de resíduos revelam a distribuição '
        'dos erros. Desvios da diagonal no QQ-Plot indicam que os resíduos não seguem '
        'distribuição normal — parcialmente devido ao N pequeno e ao desbalanceamento '
        'de classes (maioria "alto"). Isso é esperado e não invalida a análise exploratória.'
    )

st.markdown('---')