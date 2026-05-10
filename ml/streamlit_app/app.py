"""SIMA — Dashboard analítico (Trilha de Análise e Visualização de Dados, 5º CC).

Painel separado do frontend React. Lê o mesmo Postgres, mostra EDA, séries
temporais e métricas do modelo de regressão treinado em ml/notebooks/.

Rodar local:
    streamlit run ml/streamlit_app/app.py
"""

import streamlit as st

st.set_page_config(
    page_title='SIMA — Dashboard Analítico',
    page_icon='🌧️',
    layout='wide',
)

st.title('SIMA — Dashboard Analítico')
st.caption('Sistema Inteligente de Monitoramento e Alerta de Alagamentos')

st.markdown(
    """
    Painel da **Trilha de Análise e Visualização de Dados** (5º CC).

    Conteúdo a ser implementado conforme os notebooks em `ml/notebooks/`:

    - **EDA** — distribuição de relatos por bairro, séries temporais, correlação chuva x nível
    - **Modelo de regressão** — métricas (MAE, RMSE, R²)
    - **Classificador** — matriz de confusão, curva ROC
    - **Filtros** — bairro, período (24h / 7d / 30d), nível de risco
    """
)

st.info('Boilerplate inicial. Próximo passo: notebook 01_eda.ipynb.')
