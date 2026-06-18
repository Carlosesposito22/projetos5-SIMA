"""SIMA — Dashboard Analítico (página inicial).

Trilha de Análise e Visualização de Dados · 5º Período CC · Cesar School
"""
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
from utils.db import get_relatos

st.set_page_config(
    page_title='SIMA — Analytics',
    page_icon='🌧️',
    layout='wide',
    initial_sidebar_state='expanded',
)

st.title('SIMA — Dashboard Analítico')
st.caption(
    'Sistema Inteligente de Monitoramento e Alerta de Alagamentos · '
    'Cesar School 5º CC · Trilha de Análise e Visualização de Dados'
)

try:
    df = get_relatos()
except Exception as e:
    st.error(f'**Erro ao conectar ao banco:** `{e}`')
    st.info(
        f'DATABASE_URL em uso: `{os.getenv("DATABASE_URL", "postgresql://sima:sima@localhost:5432/sima")}`\n\n'
        'Verifique se o PostgreSQL está rodando e acessível nesse endereço.'
    )
    st.stop()

if df.empty:
    st.warning('Banco acessível, mas sem relatos cadastrados ainda.')
else:
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric('Total de Relatos', len(df))
    with col2:
        st.metric('Bairros Afetados', int(df['bairro'].nunique()))
    with col3:
        pct_alto = int((df['nivel'] == 'alto').mean() * 100)
        st.metric('Nível Alto', f'{pct_alto}%')
    with col4:
        ultima = df['created_at'].max()
        st.metric('Último Relato', ultima.strftime('%d/%m/%Y %H:%M') if pd.notna(ultima) else '—')

st.markdown('---')

st.markdown("""
## Navegue pelas análises

Use o **menu lateral** para acessar cada seção da análise:

| Página | Conteúdo |
|---|---|
| **Visão Geral** | Distribuição por nível de severidade, top bairros, mapa de ocorrências |
| **Análise Temporal** | Padrão horário, por data e por bairro |
| **Regressão** | Correlação entre variáveis e modelos de regressão linear |
| **Modelos ML** | Classificadores (Árvore + Regressão Logística), métricas, ROC |
| **Notebooks** | Links para os notebooks EDA, Regressão e Classificador no Google Colab |
| **Sobre** | Documentação de decisões visuais, insights e limitações |

---

### Contexto dos Dados

Os dados provêm de três fontes:

- **Relatos reais** — coletados via crowdsourcing no banco PostgreSQL do SIMA
- **Dados simulados** — gerados com sazonalidade realista calibrada nos dados reais
  (script `ml/scripts/gerar_dados_historicos.py`)
- **Questionário** — 42 respostas de moradores de Recife (analisadas nos notebooks CC3)

> Os modelos de regressão e classificação usam dados simulados quando o volume real
> é insuficiente para análise estatística robusta (< 50 amostras por classe).
> Esta escolha está declarada explicitamente em cada seção.
""")
