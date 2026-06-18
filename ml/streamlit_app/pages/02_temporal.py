"""Análise Temporal — padrão horário, por data e por bairro."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st

from utils.db import get_relatos

st.set_page_config(page_title='Análise Temporal · SIMA', layout='wide')

MAP_COR = {'baixo': '#10b981', 'medio': '#f59e0b', 'alto': '#ef4444'}

# ──────────────────────────────────────────────────────────────────────────────
# Dados
# ──────────────────────────────────────────────────────────────────────────────
st.title('Análise Temporal')
st.caption('Padrão horário, mensal e por data dos relatos de alagamento.')

try:
    df = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

# ──────────────────────────────────────────────────────────────────────────────
# Relatos por hora do dia
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Distribuição por Hora do Dia')

hora_nivel = (
    df.groupby(['hora', 'nivel'])
    .size()
    .unstack(fill_value=0)
    .reindex(columns=['baixo', 'medio', 'alto'], fill_value=0)
)

fig, ax = plt.subplots(figsize=(13, 4))
hora_nivel.plot(
    kind='bar', stacked=True, ax=ax,
    color=[MAP_COR[n] for n in ['baixo', 'medio', 'alto']],
    edgecolor='white',
)
ax.set_title('Relatos por Hora do Dia (empilhado por nível)', fontsize=12, fontweight='bold')
ax.set_xlabel('Hora')
ax.set_ylabel('Nº de Relatos')
ax.set_xticklabels([f'{int(h)}h' for h in hora_nivel.index], rotation=0)
ax.legend(title='Nível', labels=['Baixo', 'Médio', 'Alto'])
plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

if not hora_nivel.empty:
    hora_pico = hora_nivel.sum(axis=1).idxmax()
    st.info(
        f'**Insight:** O horário de pico é **{hora_pico}h**. '
        'Padrão esperado: chuvas convectivas vespertinas são típicas do litoral nordestino '
        '(16h–23h). Alertas emitidos com antecedência nessa janela seriam mais eficazes.'
    )

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Relatos por data
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Distribuição por Data')

data_nivel = (
    df.groupby(['data', 'nivel'])
    .size()
    .unstack(fill_value=0)
    .reindex(columns=['baixo', 'medio', 'alto'], fill_value=0)
)

fig, ax = plt.subplots(figsize=(13, 4))
data_nivel.plot(
    kind='bar', stacked=True, ax=ax,
    color=[MAP_COR[n] for n in ['baixo', 'medio', 'alto']],
    edgecolor='white',
)
ax.set_title('Relatos por Data (empilhado por nível)', fontsize=12, fontweight='bold')
ax.set_xlabel('Data')
ax.set_ylabel('Nº de Relatos')
rotacao = 30 if len(data_nivel) > 10 else 0
ax.set_xticklabels(
    [str(d) for d in data_nivel.index],
    rotation=rotacao, ha='right' if rotacao else 'center',
)
ax.legend(title='Nível', labels=['Baixo', 'Médio', 'Alto'])
plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

if not data_nivel.empty:
    data_pico = data_nivel.sum(axis=1).idxmax()
    total_pico = int(data_nivel.sum(axis=1).max())
    st.info(
        f'**Insight:** O dia com mais relatos foi **{data_pico}** ({total_pico} ocorrências). '
        'Picos isolados geralmente correspondem a eventos de chuva intensa — '
        'evidência do caráter episódico dos alagamentos em Recife.'
    )

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Distribuição por bairro e nível
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Distribuição por Bairro e Nível')

df_b = df.dropna(subset=['bairro'])
if df_b.empty:
    st.warning('Nenhum relato com bairro associado.')
else:
    cross = (
        pd.crosstab(df_b['bairro'], df_b['nivel'])
        .reindex(columns=['baixo', 'medio', 'alto'], fill_value=0)
    )
    cross['total'] = cross.sum(axis=1)
    cross = cross.sort_values('total', ascending=False)

    fig, ax = plt.subplots(figsize=(13, max(4, len(cross) * 0.5)))
    cross[['baixo', 'medio', 'alto']].plot(
        kind='bar', ax=ax,
        color=[MAP_COR[n] for n in ['baixo', 'medio', 'alto']],
        edgecolor='white',
    )
    ax.set_title('Nível de Severidade por Bairro', fontsize=12, fontweight='bold')
    ax.set_xlabel('Bairro')
    ax.set_ylabel('Nº de Relatos')
    ax.set_xticklabels(cross.index, rotation=30, ha='right')
    ax.legend(title='Nível', labels=['Baixo', 'Médio', 'Alto'])
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    st.info(
        '**Insight:** Bairros com alta proporção de nível "alto" são candidatos '
        'imediatos à expansão de sensores IoT e ampliação do raio de alerta via WhatsApp.'
    )

