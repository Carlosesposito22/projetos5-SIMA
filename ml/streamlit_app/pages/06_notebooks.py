"""Notebooks — links para os notebooks analíticos hospedados no Google Drive."""
import streamlit as st

st.set_page_config(page_title='Notebooks · SIMA', layout='wide')

st.title('Notebooks')

st.markdown('---')

NOTEBOOKS = [
    {
        'titulo':   'CC3 — Análise Exploratória de Dados (EDA)',
        'descricao': (
            'Carregamento e limpeza dos dados do PostgreSQL, estatísticas descritivas '
            '(média, desvio-padrão, quartis), distribuições por nível e bairro, '
            'heatmap de correlações, séries temporais e análise multivariada. '
            'Ponto de entrada para entender o perfil dos alagamentos em Recife.'
        ),
        'link': 'https://colab.research.google.com/drive/1BblyqM53jgI9gWpYeBfBCNANrvuKSrVN?usp=sharing',
        'badge': '📊 EDA',
        'cor': '#10b981',
    },
    {
        'titulo':   'CC4 — Regressão Linear',
        'descricao': (
            'Feature engineering (hora do dia, precipitação acumulada, janela de relatos anteriores), '
            'regressão linear simples e múltipla, gráficos de dispersão com linha de tendência, '
            'análise de resíduos (histograma + QQ-plot) e métricas MAE, RMSE e R². '
            'Objetivo: prever o volume de relatos nas próximas horas.'
        ),
        'link': 'https://colab.research.google.com/drive/10j3-yDxHBOIVMYEMUY9B5T2XALdt-QoN?usp=sharing',
        'badge': '📈 Regressão',
        'cor': '#f59e0b',
    },
    {
        'titulo':   'CC5 — Classificador de Risco',
        'descricao': (
            'Definição do target (Atenção / Alerta / Crítico), split treino/teste estratificado, '
            'Random Forest com validação LOOCV (Leave-One-Out), matriz de confusão normalizada, '
            'curva ROC multi-classe (One-vs-Rest), curva Precision-Recall e importância de features. '
            'Objetivo: classificar automaticamente o nível de risco de um bairro.'
        ),
        'link': 'https://colab.research.google.com/drive/1NpyVsRknxGwChz1p3LiMT0atefsnxD35?usp=sharing',
        'badge': '🤖 Classificação',
        'cor': '#ef4444',
    },
]

for nb in NOTEBOOKS:
    with st.container():
        col_info, col_btn = st.columns([5, 1])

        with col_info:
            st.markdown(
                f'<span style="background:{nb["cor"]}22; color:{nb["cor"]}; '
                f'padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">'
                f'{nb["badge"]}</span>',
                unsafe_allow_html=True,
            )
            st.markdown(f'### {nb["titulo"]}')
            st.markdown(nb['descricao'])

        with col_btn:
            st.markdown('<div style="height:60px"></div>', unsafe_allow_html=True)
            placeholder = nb['link'].startswith('COLE_AQUI')
            if placeholder:
                st.button('Abrir ↗', key=nb['badge'], disabled=True,
                          help='Link ainda não configurado — cole a URL do Google Drive no código.')
                st.caption('Link pendente')
            else:
                st.link_button('Abrir ↗', nb['link'], use_container_width=True)

        st.markdown('---')

