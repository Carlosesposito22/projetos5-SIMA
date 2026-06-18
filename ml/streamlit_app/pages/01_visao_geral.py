"""Visão Geral — distribuição por nível, top bairros, mapa de ocorrências."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import streamlit as st

from utils.db import get_relatos

st.set_page_config(page_title='Visão Geral · SIMA', layout='wide')

MAP_COR = {'baixo': '#10b981', 'medio': '#f59e0b', 'alto': '#ef4444'}

# ──────────────────────────────────────────────────────────────────────────────
# Dados e filtros
# ──────────────────────────────────────────────────────────────────────────────
st.title('Visão Geral')
st.caption('Distribuição dos relatos por nível de severidade, bairro e localização geográfica.')

try:
    df_full = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

with st.sidebar:
    st.header('Filtros')
    niveis_disp = ['baixo', 'medio', 'alto']
    niveis_sel  = st.multiselect('Nível', niveis_disp, default=niveis_disp)

df = df_full[df_full['nivel'].isin(niveis_sel)] if niveis_sel else df_full

# ──────────────────────────────────────────────────────────────────────────────
# KPIs
# ──────────────────────────────────────────────────────────────────────────────
c1, c2, c3, c4 = st.columns(4)
c1.metric('Total de Relatos', len(df))
c2.metric('Bairros Afetados', int(df['bairro'].nunique()))
c3.metric('Nível Dominante', df['nivel'].mode()[0].capitalize() if not df.empty else '—')
pct_alto = f"{int((df['nivel'] == 'alto').mean() * 100)}%" if not df.empty else '—'
c4.metric('% Nível Alto', pct_alto)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Distribuição por nível
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Distribuição por Nível de Severidade')

contagem = df['nivel'].value_counts().reindex(['baixo', 'medio', 'alto']).fillna(0).astype(int)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

bars = axes[0].bar(
    contagem.index,
    contagem.values,
    color=[MAP_COR[n] for n in contagem.index],
    edgecolor='white',
    linewidth=1.5,
)
for bar, val in zip(bars, contagem.values):
    axes[0].text(
        bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
        str(val), ha='center', fontweight='bold', fontsize=13,
    )
axes[0].set_title(f'Relatos por Nível (n={len(df)})', fontsize=12, fontweight='bold')
axes[0].set_ylabel('Nº de Relatos')
axes[0].set_ylim(0, contagem.max() * 1.15 + 1)
axes[0].set_xticklabels([n.capitalize() for n in contagem.index])

pie_vals = contagem[contagem > 0]
axes[1].pie(
    pie_vals.values,
    labels=[n.capitalize() for n in pie_vals.index],
    colors=[MAP_COR[n] for n in pie_vals.index],
    autopct='%1.1f%%',
    startangle=90,
    wedgeprops={'edgecolor': 'white', 'linewidth': 2},
)
axes[1].set_title('Proporção por Nível', fontsize=12, fontweight='bold')

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

st.info(
    f'**Insight:** {pct_alto} dos relatos são de nível **alto**. '
    'Cidadãos tendem a reportar apenas situações já críticas — viés de uso inicial '
    'que deve diminuir à medida que o sistema ganhar adoção.'
)

# ──────────────────────────────────────────────────────────────────────────────
# Top bairros
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Bairros com Mais Ocorrências')

df_bairro = df.dropna(subset=['bairro'])
if df_bairro.empty:
    st.warning('Nenhum relato com bairro associado nos filtros selecionados.')
else:
    top = df_bairro['bairro'].value_counts()
    nivel_max = (
        df_bairro.groupby('bairro')['nivel_num']
        .max()
        .map({1: 'baixo', 2: 'medio', 3: 'alto'})
    )
    cores_b = [MAP_COR.get(nivel_max.get(b, 'alto'), '#ef4444') for b in top.index]

    fig, ax = plt.subplots(figsize=(10, max(4, len(top) * 0.45)))
    bars = ax.barh(top.index[::-1], top.values[::-1], color=cores_b[::-1], edgecolor='white')
    for bar, val in zip(bars, top.values[::-1]):
        ax.text(
            bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
            str(val), va='center', fontweight='bold',
        )
    ax.set_title('Relatos por Bairro (cor = nível máximo registrado)', fontsize=12, fontweight='bold')
    ax.set_xlabel('Nº de Relatos')
    ax.legend(
        handles=[mpatches.Patch(color=c, label=n.capitalize()) for n, c in MAP_COR.items()],
        title='Nível Máximo',
    )
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    lider = top.index[0]
    pct_lider = int(top.values[0] / len(df_bairro) * 100)
    st.info(
        f'**Insight:** **{lider}** concentra {pct_lider}% de todos os relatos '
        f'({top.values[0]} de {len(df_bairro)}), indicando ponto crítico recorrente '
        'que merece atenção prioritária da Defesa Civil.'
    )

# ──────────────────────────────────────────────────────────────────────────────
# Mapa de ocorrências (scatter lat/lng)
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Localização Geográfica dos Relatos')

df_geo = df.dropna(subset=['lat', 'lng'])
if df_geo.empty:
    st.warning('Nenhum relato com coordenadas geográficas disponíveis.')
else:
    fig, ax = plt.subplots(figsize=(8, 7))
    for nivel, grp in df_geo.groupby('nivel'):
        ax.scatter(
            grp['lng'], grp['lat'],
            c=MAP_COR[nivel], label=nivel.capitalize(),
            s=80, edgecolors='white', linewidth=0.8, alpha=0.85, zorder=3,
        )
    ax.set_title('Localização dos Relatos (lat/lng)', fontsize=12, fontweight='bold')
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.legend(title='Nível')

    for bairro, grp in df_geo.dropna(subset=['bairro']).groupby('bairro'):
        cx, cy = grp['lng'].mean(), grp['lat'].mean()
        ax.annotate(bairro, (cx, cy), fontsize=7, alpha=0.6, ha='center', va='bottom')

    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    st.info(
        '**Insight:** O mapa revela concentração geográfica dos alagamentos. '
        'Bairros em cotas mais baixas e próximos a canais acumulam mais ocorrências de nível alto.'
    )
