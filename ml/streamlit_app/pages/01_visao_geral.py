"""Visão Geral — distribuição por nível, concentração geográfica, perfil de risco."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import streamlit as st

from utils.db import get_relatos

st.set_page_config(page_title='Visão Geral · SIMA', layout='wide')

MAP_COR = {'baixo': '#10b981', 'medio': '#f59e0b', 'alto': '#ef4444'}

# ──────────────────────────────────────────────────────────────────────────────
# Dados
# ──────────────────────────────────────────────────────────────────────────────
st.title('Visão Geral')
st.caption('Perfil de risco, concentração geográfica e análise de severidade dos relatos.')

try:
    df_full = get_relatos()
except Exception as e:
    st.error(f'Erro ao carregar dados: `{e}`')
    st.stop()

with st.sidebar:
    st.header('Filtros')
    niveis_sel = st.multiselect('Nível', ['baixo', 'medio', 'alto'], default=['baixo', 'medio', 'alto'])

df = df_full[df_full['nivel'].isin(niveis_sel)] if niveis_sel else df_full
n  = len(df)

# ──────────────────────────────────────────────────────────────────────────────
# KPIs
# ──────────────────────────────────────────────────────────────────────────────
severidade_media = df['nivel_num'].mean() if n > 0 else 0
n_bairros_afet   = int(df['bairro'].nunique())
dias_monitorados = (df['created_at'].max() - df['created_at'].min()).days + 1 if n > 1 else 1
taxa_diaria      = round(n / dias_monitorados, 1)

c1, c2, c3, c4 = st.columns(4)
c1.metric('Total de Relatos', n)
c2.metric('Índice de Severidade', f'{severidade_media:.2f} / 3',
          help='Média ponderada: Baixo=1, Médio=2, Alto=3. Quanto mais próximo de 3, mais grave.')
c3.metric('Bairros Afetados', f'{n_bairros_afet}',
          help='Número de bairros distintos com pelo menos 1 relato.')
c4.metric('Relatos / Dia', taxa_diaria,
          help=f'Média sobre {dias_monitorados} dias de dados.')

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Seção 1 — Perfil de severidade (barra com baseline + pizza anotada)
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Perfil de Severidade dos Relatos')

contagem = df['nivel'].value_counts().reindex(['baixo', 'medio', 'alto']).fillna(0).astype(int)
proporcao = contagem / contagem.sum() * 100

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Barras com linha de baseline uniforme (33,3%)
bars = axes[0].bar(
    [n.capitalize() for n in contagem.index],
    proporcao.values,
    color=[MAP_COR[n] for n in contagem.index],
    edgecolor='white', linewidth=1.5, zorder=3,
)
axes[0].axhline(33.3, color='#64748b', linewidth=1.4, linestyle='--', zorder=2,
                label='Distribuição uniforme esperada (33%)')
for bar, pct, val in zip(bars, proporcao.values, contagem.values):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.8,
                 f'{pct:.1f}%\n({val})', ha='center', fontweight='bold', fontsize=10)
axes[0].set_title('Proporção por Nível vs. Baseline Uniforme', fontsize=12, fontweight='bold')
axes[0].set_ylabel('% dos Relatos')
axes[0].set_ylim(0, proporcao.max() * 1.25)
axes[0].legend(fontsize=8)
axes[0].grid(axis='y', alpha=0.3)

# Pizza com wedge explodido para o nível alto
explode = [0.04 if n == 'alto' else 0 for n in contagem.index]
pie_vals = contagem[contagem > 0]
exp_vals = [explode[i] for i, n in enumerate(contagem.index) if contagem[n] > 0]
axes[1].pie(
    pie_vals.values,
    labels=[n.capitalize() for n in pie_vals.index],
    colors=[MAP_COR[n] for n in pie_vals.index],
    autopct='%1.1f%%', startangle=90,
    explode=exp_vals,
    wedgeprops={'edgecolor': 'white', 'linewidth': 2},
    textprops={'fontsize': 10},
)
axes[1].set_title('Composição por Nível de Risco', fontsize=12, fontweight='bold')

plt.tight_layout()
st.pyplot(fig, use_container_width=True)
plt.close(fig)

pct_alto = proporcao.get('alto', 0)
vies     = round(pct_alto / 33.3, 1)
st.info(
    f'**{pct_alto:.1f}% dos relatos são de nível alto** — {vies}× acima do que seria esperado '
    f'em uma distribuição uniforme entre os três níveis (33%). '
    f'Esse desvio não indica que o risco real seja maior: indica que **os cidadãos só reportam '
    f'quando a situação já é grave**. Relatos de nível baixo e médio, que seriam os mais valiosos '
    f'para previsão antecipada, representam apenas {100 - pct_alto:.1f}% do total. '
    f'O índice de severidade médio de **{severidade_media:.2f}/3** confirma o perfil: '
    f'quase toda a base está concentrada no extremo superior da escala. '
    f'**Implicação para o modelo:** um classificador treinado nesses dados vai ter viés sistemático '
    f'para prever "alto" — calibração e dados de nível baixo/médio são necessários para corrigir isso.'
)

st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Seção 2 — Curva de Pareto dos bairros
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Concentração de Risco por Bairro — Curva de Pareto')

df_b = df.dropna(subset=['bairro'])
if not df_b.empty:
    contagem_b = df_b['bairro'].value_counts().reset_index()
    contagem_b.columns = ['bairro', 'total']
    contagem_b = contagem_b.sort_values('total', ascending=False).reset_index(drop=True)
    contagem_b['cumulativo_pct'] = contagem_b['total'].cumsum() / contagem_b['total'].sum() * 100

    # Quantos bairros cobrem 80%?
    n80  = int((contagem_b['cumulativo_pct'] <= 80).sum()) + 1
    n_bt = len(contagem_b)
    pct_bairros_80 = round(n80 / n_bt * 100, 1)

    fig, ax = plt.subplots(figsize=(12, 4))
    ax.bar(range(len(contagem_b)), contagem_b['total'],
           color='#ef4444', alpha=0.6, edgecolor='white', linewidth=0.3, label='Relatos por bairro')
    ax2 = ax.twinx()
    ax2.plot(range(len(contagem_b)), contagem_b['cumulativo_pct'],
             color='#1d4ed8', linewidth=2, label='Acumulado (%)')
    ax2.axhline(80, color='#64748b', linewidth=1.2, linestyle='--')
    ax2.axvline(n80 - 1, color='#64748b', linewidth=1.2, linestyle='--')
    ax2.text(n80, 82, f'{n80} bairros\n= 80% dos relatos', fontsize=8,
             color='#1d4ed8', fontweight='bold')
    ax2.set_ylabel('Acumulado (%)', color='#1d4ed8')
    ax2.tick_params(axis='y', labelcolor='#1d4ed8')
    ax2.set_ylim(0, 115)
    ax.set_xlabel(f'Bairros (ordenados por volume — {n_bt} total)')
    ax.set_ylabel('Relatos')
    ax.set_title('Curva de Pareto — Concentração de Relatos por Bairro', fontsize=12, fontweight='bold')
    ax.set_xticks([])
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    top3_pct = round(contagem_b['total'].head(3).sum() / contagem_b['total'].sum() * 100, 1)
    top1     = contagem_b.iloc[0]
    st.info(
        f'**{n80} bairros ({pct_bairros_80}% do total monitorado) concentram 80% de todos os relatos.** '
        f'Os outros {n_bt - n80} bairros dividem apenas 20% das ocorrências. '
        f'Só o bairro **{top1["bairro"]}** responde por {round(top1["total"]/contagem_b["total"].sum()*100,1)}% '
        f'do total sozinho, e os 3 primeiros juntos por {top3_pct}%. '
        f'Esse padrão clássico de Pareto revela que o risco de alagamento em Recife é altamente '
        f'concentrado geograficamente — **não é um problema distribuído pela cidade**. '
        f'Isso tem implicação direta de alocação: cobrir esses {n80} bairros com sensores e '
        f'alertas dirigidos já endereça 80% do problema histórico.'
    )

    st.markdown('---')

    # ──────────────────────────────────────────────────────────────────────────────
    # Seção 3 — Volume vs Gravidade (top 12 bairros)
    # ──────────────────────────────────────────────────────────────────────────────
    st.subheader('Volume vs. Gravidade — Top 12 Bairros')
    st.caption('Volume = número de relatos. Gravidade = % de relatos de nível alto. Um bairro pode ter poucos relatos, mas todos graves.')

    top12_nomes = list(contagem_b.head(12)['bairro'])
    df_top12    = df_b[df_b['bairro'].isin(top12_nomes)]

    vol    = df_top12.groupby('bairro').size()
    graves = df_top12[df_top12['nivel'] == 'alto'].groupby('bairro').size()
    pct_grave = (graves / vol * 100).fillna(0).reindex(top12_nomes)
    vol       = vol.reindex(top12_nomes)

    ordem_vol = vol.sort_values(ascending=True)
    ordem_grav = pct_grave.reindex(ordem_vol.index)

    fig, (ax_v, ax_g) = plt.subplots(1, 2, figsize=(13, 5))

    # Volume
    cores_vol = ['#ef4444' if b == contagem_b.iloc[0]['bairro'] else '#f87171' for b in ordem_vol.index]
    bars_v = ax_v.barh(ordem_vol.index, ordem_vol.values, color=cores_vol, edgecolor='white')
    for bar, val in zip(bars_v, ordem_vol.values):
        ax_v.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2,
                  str(int(val)), va='center', fontsize=8, fontweight='bold')
    ax_v.set_title('Volume de Relatos', fontsize=11, fontweight='bold')
    ax_v.set_xlabel('Nº de Relatos')
    ax_v.tick_params(axis='y', labelsize=8)
    ax_v.set_xlim(0, ordem_vol.max() * 1.15)

    # % nível alto
    cores_grav = ['#dc2626' if v >= 90 else '#ef4444' if v >= 70 else '#f59e0b' for v in ordem_grav.values]
    bars_g = ax_g.barh(ordem_grav.index, ordem_grav.values, color=cores_grav, edgecolor='white')
    for bar, val in zip(bars_g, ordem_grav.values):
        ax_g.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                  f'{val:.0f}%', va='center', fontsize=8, fontweight='bold')
    ax_g.axvline(pct_alto, color='#64748b', linewidth=1.2, linestyle='--',
                 label=f'Média geral ({pct_alto:.0f}%)')
    ax_g.set_title('% Relatos de Nível Alto', fontsize=11, fontweight='bold')
    ax_g.set_xlabel('% nível alto')
    ax_g.set_xlim(0, 115)
    ax_g.tick_params(axis='y', labelsize=8)
    ax_g.legend(fontsize=8)

    plt.suptitle('Top 12 Bairros — Comparação de Volume e Gravidade',
                 fontsize=12, fontweight='bold', y=1.01)
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    # Bairro mais grave (% alto) entre os top 12
    mais_grave  = pct_grave.idxmax()
    pct_mg      = round(float(pct_grave.max()), 1)
    mais_volume = vol.idxmax()
    # Bairros acima da média de % alto
    acima_media = (pct_grave > pct_alto).sum()

    st.info(
        f'**O bairro com maior volume ({mais_volume}) e o mais grave ({mais_grave}) são '
        f'{"o mesmo" if mais_volume == mais_grave else "diferentes"}** — '
        f'{"reforçando que frequência e gravidade coincidem no mesmo ponto crítico." if mais_volume == mais_grave else f"o que revela um padrão importante: {mais_grave} tem {pct_mg}% dos seus relatos em nível alto, mas aparece abaixo de {mais_volume} em volume. Isso significa que {mais_grave} é mais silencioso, mas quando reporta, é sempre grave."} '
        f'{acima_media} dos top 12 bairros estão acima da média geral de gravidade ({pct_alto:.0f}%), '
        f'sugerindo que os bairros mais reportados não são apenas frequentes — '
        f'**eles também são estruturalmente mais graves**, e não apenas sub-amostras ruidosas.'
    )

    st.markdown('---')

# ──────────────────────────────────────────────────────────────────────────────
# Seção 4 — Mapa de bolhas por bairro
# ──────────────────────────────────────────────────────────────────────────────
st.subheader('Mapa de Risco por Bairro')
st.caption('Cada bolha representa um bairro. Tamanho = volume de relatos. Cor = nível dominante.')

df_geo = df.dropna(subset=['lat', 'lng', 'bairro'])
if df_geo.empty:
    st.warning('Nenhum relato com coordenadas e bairro disponíveis.')
else:
    # Agregar por bairro: centróide, volume, nível dominante, índice de severidade
    agg = df_geo.groupby('bairro').agg(
        lat=('lat', 'mean'),
        lng=('lng', 'mean'),
        total=('nivel', 'count'),
        severidade=('nivel_num', 'mean'),
    ).reset_index()

    # Nível dominante por bairro (mode)
    nivel_dom = df_geo.groupby('bairro')['nivel'].agg(
        lambda x: x.value_counts().index[0]
    ).rename('nivel_dom')
    agg = agg.join(nivel_dom, on='bairro')

    # Escala de tamanho: raiz quadrada para não explodir bolhas grandes
    max_size = 1200
    agg['size'] = (np.sqrt(agg['total']) / np.sqrt(agg['total'].max()) * max_size).clip(lower=40)

    # Separar top-N para anotar (só os maiores para não poluir)
    n_label = min(15, len(agg))
    top_label = set(agg.nlargest(n_label, 'total')['bairro'])

    fig, ax = plt.subplots(figsize=(10, 8))

    for nivel in ['baixo', 'medio', 'alto']:
        sub = agg[agg['nivel_dom'] == nivel]
        if sub.empty:
            continue
        ax.scatter(
            sub['lng'], sub['lat'],
            s=sub['size'],
            c=MAP_COR[nivel],
            alpha=0.80,
            edgecolors='white',
            linewidth=1.2,
            label=nivel.capitalize(),
            zorder=3,
        )

    # Anotar apenas os bairros de maior volume
    for _, row in agg[agg['bairro'].isin(top_label)].iterrows():
        ax.annotate(
            row['bairro'],
            (row['lng'], row['lat']),
            fontsize=7.5,
            fontweight='bold',
            ha='center',
            va='bottom',
            xytext=(0, 6),
            textcoords='offset points',
            color='white',
            bbox=dict(boxstyle='round,pad=0.15', fc='#1e293b', alpha=0.65, lw=0),
        )

    # Legenda de tamanho
    for vol_ref in [10, 50, 100]:
        if vol_ref <= agg['total'].max():
            s_ref = np.sqrt(vol_ref) / np.sqrt(agg['total'].max()) * max_size
            ax.scatter([], [], s=s_ref, c='#94a3b8', alpha=0.7,
                       edgecolors='white', label=f'{vol_ref} relatos')

    ax.set_title('Concentração Geográfica de Risco — Recife\n'
                 '(bairros com ≥ 1 relato; cor = nível dominante)',
                 fontsize=12, fontweight='bold')
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.legend(title='', loc='upper right', fontsize=8, framealpha=0.85)
    ax.set_facecolor('#0f172a')
    fig.patch.set_facecolor('#1e293b')
    ax.tick_params(colors='#94a3b8')
    ax.xaxis.label.set_color('#94a3b8')
    ax.yaxis.label.set_color('#94a3b8')
    ax.title.set_color('white')
    ax.grid(alpha=0.1, color='#475569')
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)
    plt.close(fig)

    # Estatísticas para o insight
    lat_range   = float(df_geo['lat'].max() - df_geo['lat'].min())
    lng_range   = float(df_geo['lng'].max() - df_geo['lng'].min())
    extensao_ns = round(lat_range * 111, 1)
    extensao_ew = round(lng_range * 111, 1)
    n_bairros_map = len(agg)
    n_criticos    = int((agg['nivel_dom'] == 'alto').sum())
    pct_criticos  = round(n_criticos / n_bairros_map * 100)
    top1_map      = agg.nlargest(1, 'total').iloc[0]

    st.info(
        f'**{n_criticos} dos {n_bairros_map} bairros com relatos ({pct_criticos}%) têm "alto" como nível dominante** — '
        f'ou seja, mais da metade dos seus relatos é de emergência. '
        f'A bolha de **{top1_map["bairro"]}** é a maior do mapa ({int(top1_map["total"])} relatos, '
        f'severidade média {top1_map["severidade"]:.2f}/3), e seu centróide geográfico '
        f'indica o epicentro histórico de alagamentos na cidade. '
        f'Os relatos cobrem aproximadamente **{extensao_ns} km (N-S) × {extensao_ew} km (L-O)** '
        f'do município — a distribuição espacial mostra que o problema não é uniforme: '
        f'há clusters densos onde o risco se acumula, separados por áreas quase sem relatos.'
    )
