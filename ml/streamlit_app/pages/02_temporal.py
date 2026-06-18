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
st.caption('Padrão horário, mensal e por bairro dos relatos de alagamento.')

try:
    df = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

n_total = len(df)

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
hora_total = hora_nivel.sum(axis=1)

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

if not hora_total.empty:
    hora_pico     = int(hora_total.idxmax())
    hora_vale     = int(hora_total.idxmin())
    n_pico        = int(hora_total.max())
    n_vale        = int(hora_total.min())

    # Janela vespertina 16h–22h vs resto
    vespertino    = hora_total[hora_total.index.isin(range(16, 23))].sum()
    pct_vesp      = int(vespertino / n_total * 100)

    # Horas com mais relatos de nível alto
    if 'alto' in hora_nivel.columns:
        hora_mais_alto = int(hora_nivel['alto'].idxmax())
        pct_alto_pico  = int(hora_nivel.loc[hora_mais_alto, 'alto'] / hora_total[hora_mais_alto] * 100) if hora_total[hora_mais_alto] > 0 else 0
    else:
        hora_mais_alto, pct_alto_pico = hora_pico, 0

    razao = round(n_pico / n_vale, 1) if n_vale > 0 else '∞'

    st.info(
        f'**{pct_vesp}% dos relatos ocorrem entre 16h e 22h** — janela que coincide com as chuvas '
        f'convectivas vespertinas típicas do litoral nordestino. '
        f'O pico absoluto é às **{hora_pico}h** ({n_pico} relatos), '
        f'contra apenas {n_vale} relatos às {hora_vale}h — uma razão de **{razao}×** entre o horário '
        f'mais e menos crítico. '
        f'Às {hora_mais_alto}h, {pct_alto_pico}% dos relatos são de nível alto, '
        f'o que indica que a gravidade dos alagamentos também aumenta nessa janela, '
        f'não só o volume. '
        f'**Implicação operacional:** emitir alertas preventivos às 15h–15h30 cobriria '
        f'o pico antes de ele acontecer, dando ao menos 30–60 min de antecedência para evacuação.'
    )

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Relatos por mês (com linha de total)
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Distribuição por Mês')

NOMES_MES = {
    1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
}
MESES_CHUVOSOS = {4, 5, 6, 7, 8}  # abril–agosto: período chuvoso de Recife

mes_nivel = (
    df.groupby(['mes', 'nivel'])
    .size()
    .unstack(fill_value=0)
    .reindex(index=range(1, 13), columns=['baixo', 'medio', 'alto'], fill_value=0)
)
mes_total = mes_nivel.sum(axis=1)

fig, ax1 = plt.subplots(figsize=(12, 4))
mes_nivel.plot(
    kind='bar', stacked=True, ax=ax1,
    color=[MAP_COR[n] for n in ['baixo', 'medio', 'alto']],
    edgecolor='white', width=0.7,
)
ax1.set_title('Relatos por Mês (empilhado por nível)', fontsize=12, fontweight='bold')
ax1.set_xlabel('')
ax1.set_ylabel('Nº de Relatos')
ax1.set_xticklabels([NOMES_MES[m] for m in mes_nivel.index], rotation=0)
ax1.legend(title='Nível', labels=['Baixo', 'Médio', 'Alto'], loc='upper left')

ax2 = ax1.twinx()
ax2.plot(
    range(len(mes_total)), mes_total.values,
    color='#1d4ed8', linewidth=2, marker='o', markersize=5,
)
ax2.set_ylabel('Total', color='#1d4ed8')
ax2.tick_params(axis='y', labelcolor='#1d4ed8')
ax2.set_ylim(0, mes_total.max() * 2.2)

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

mes_pico    = int(mes_total.idxmax())
mes_vale    = int(mes_total.idxmin())
n_mes_pico  = int(mes_total[mes_pico])
n_mes_vale  = int(mes_total[mes_vale])
n_chuvoso   = int(mes_total[mes_total.index.isin(MESES_CHUVOSOS)].sum())
pct_chuvoso = int(n_chuvoso / n_total * 100)
razao_mes   = round(n_mes_pico / n_mes_vale, 1) if n_mes_vale > 0 else '∞'

# Mês com maior % de nível alto
if 'alto' in mes_nivel.columns:
    pct_alto_por_mes = (mes_nivel['alto'] / mes_total.replace(0, 1) * 100)
    mes_mais_critico = int(pct_alto_por_mes.idxmax())
    pct_critico_max  = int(pct_alto_por_mes[mes_mais_critico])
else:
    mes_mais_critico, pct_critico_max = mes_pico, 0

st.info(
    f'**{pct_chuvoso}% de todos os relatos se concentram no período chuvoso '
    f'(abril–agosto)**, confirmando a sazonalidade climática do Recife. '
    f'**{NOMES_MES[mes_pico]}** é o mês mais crítico em volume ({n_mes_pico} relatos), '
    f'{razao_mes}× mais do que {NOMES_MES[mes_vale]} ({n_mes_vale} relatos — mês mais tranquilo). '
    f'Em {NOMES_MES[mes_mais_critico]}, {pct_critico_max}% dos relatos são de nível alto — '
    f'o mês em que a gravidade média dos alagamentos é maior, não só o volume. '
    f'**Implicação:** reforçar equipes de campo e ampliar o limiar de disparo de alertas '
    f'durante {NOMES_MES[mes_pico]} e {NOMES_MES[mes_mais_critico]} já cobriria '
    f'os períodos de maior risco real.'
)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Top 15 bairros por volume (barras horizontais empilhadas)
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Top 15 Bairros por Volume de Relatos')

df_b = df.dropna(subset=['bairro'])
if df_b.empty:
    st.warning('Nenhum relato com bairro associado.')
else:
    cross = (
        pd.crosstab(df_b['bairro'], df_b['nivel'])
        .reindex(columns=['baixo', 'medio', 'alto'], fill_value=0)
    )
    cross['total'] = cross.sum(axis=1)
    top15 = cross.sort_values('total', ascending=True).tail(15)
    todos = cross.sort_values('total', ascending=False)

    fig, ax = plt.subplots(figsize=(10, 6))
    left = pd.Series([0] * len(top15), index=top15.index, dtype=float)
    for nivel, cor in [('baixo', MAP_COR['baixo']), ('medio', MAP_COR['medio']), ('alto', MAP_COR['alto'])]:
        ax.barh(top15.index, top15[nivel], left=left, color=cor,
                edgecolor='white', linewidth=0.5, label=nivel.capitalize())
        left = left + top15[nivel]

    for i, (idx, row) in enumerate(top15.iterrows()):
        ax.text(row['total'] + 0.3, i, str(int(row['total'])),
                va='center', fontweight='bold', fontsize=9)

    ax.set_title('Top 15 Bairros — Relatos por Nível de Severidade',
                 fontsize=12, fontweight='bold')
    ax.set_xlabel('Nº de Relatos')
    ax.set_xlim(0, top15['total'].max() * 1.12)
    ax.legend(title='Nível', loc='lower right')
    ax.tick_params(axis='y', labelsize=9)
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    # Insight calculado
    lider       = todos.index[0]
    top3_total  = int(todos['total'].head(3).sum())
    pct_top3    = int(top3_total / n_total * 100)
    n_bairros   = len(todos)

    # Bairro com maior proporção de nível alto entre os top 15
    top15_pct_alto = (top15['alto'] / top15['total'].replace(0, 1) * 100)
    bairro_mais_critico = top15_pct_alto.idxmax()
    pct_alto_critico    = int(top15_pct_alto.max())

    # Bairros com zero relatos (fora do top 15, mas no banco)
    n_sem_relato = (todos['total'] == 0).sum()

    st.info(
        f'**Os 3 bairros com mais relatos ({todos.index[0]}, {todos.index[1]}, {todos.index[2]}) '
        f'concentram {pct_top3}% de todos os {n_total} relatos**, apesar de representarem '
        f'apenas {round(3/n_bairros*100)}% dos {n_bairros} bairros monitorados. '
        f'Essa concentração extrema sugere que o risco de alagamento em Recife **não é distribuído '
        f'uniformemente** — poucos bairros respondem pela maioria das ocorrências. '
        f'Entre os top 15, **{bairro_mais_critico}** tem a maior proporção de nível alto '
        f'({pct_alto_critico}% dos seus relatos), indicando que além de frequente, '
        f'o alagamento nesse bairro tende a ser grave. '
        f'**Implicação:** concentrar sensores IoT e raio de alerta WhatsApp nesses 3 bairros '
        f'já cobriria {pct_top3}% das ocorrências históricas com recursos mínimos.'
    )
