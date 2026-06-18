"""CC8 — Documentação do Dashboard Analítico SIMA.

Página de documentação inline: decisões visuais, insights extraídos,
melhorias incorporadas e limitações declaradas.
"""

import streamlit as st

st.set_page_config(page_title='Sobre · SIMA Analytics', layout='wide')

st.title('Sobre o Dashboard Analítico')
st.caption('Documentação de decisões visuais, insights extraídos e limitações da análise')

# ──────────────────────────────────────────────────────────────────────────────
# 1. CONTEXTO DO PROJETO
# ──────────────────────────────────────────────────────────────────────────────
st.header('1. Contexto do Projeto')

st.markdown("""
O **SIMA** (Sistema Inteligente de Monitoramento e Alerta de Alagamentos) é um projeto
acadêmico do 5º Período de Ciência da Computação da Cesar School, desenvolvido em parceria
com a Prefeitura do Recife.

Este dashboard analítico é a entrega da **Trilha de Análise e Visualização de Dados (AVD)**.
Ele lê o mesmo banco PostgreSQL do sistema operacional (frontend React + Django), mas é
voltado para analistas e pesquisadores — não para o cidadão ou o operador de Defesa Civil.

**Tecnologias desta camada analítica:**
- Python 3.12 · pandas · scikit-learn · matplotlib · seaborn
- Streamlit (publicação web do dashboard)
- Jupyter Notebooks (desenvolvimento iterativo dos modelos)
""")

# ──────────────────────────────────────────────────────────────────────────────
# 2. FONTES DE DADOS
# ──────────────────────────────────────────────────────────────────────────────
st.header('2. Fontes de Dados')

st.markdown("""
A análise combina três fontes, declaradas explicitamente para garantir transparência:
""")

col1, col2, col3 = st.columns(3)

with col1:
    st.subheader('PostgreSQL — Dados Reais')
    st.markdown("""
    - **41 relatos** coletados desde o lançamento do MVP
    - Tabelas: `relatos`, `bairros`, `confirmacoes`, `denuncias`
    - Período: 2025–2026
    - Usados em: EDA (análise separada), visualizações comparativas
    """)

with col2:
    st.subheader('Dados Simulados')
    st.markdown("""
    - **800 relatos** gerados com sazonalidade realista
    - Mesmas proporções de nível dos dados reais (~83% alto)
    - Pico vespertino 16h–23h (padrão de chuvas de Recife)
    - Usados em: regressão e classificação (41 registros insuficientes para treino)
    """)

with col3:
    st.subheader('Questionário Primário')
    st.markdown("""
    - **42 respostas** de moradores de Recife
    - Coleta via Google Forms
    - Conteúdo: frequência de alagamentos, canal preferido de alerta, dificuldades
    - Usados em: EDA — seção de pesquisa com usuários
    """)

st.info(
    '**Declaração de transparência:** as análises de regressão (CC4) e classificação (CC5) '
    'usam exclusivamente dados simulados porque 41 relatos reais são insuficientes para '
    'treino e teste de modelos (mínimo de 50 amostras por classe não atingido). '
    'Os dados simulados foram calibrados para refletir a distribuição real observada.'
)

# ──────────────────────────────────────────────────────────────────────────────
# 3. DECISÕES VISUAIS
# ──────────────────────────────────────────────────────────────────────────────
st.header('3. Decisões Visuais')

st.subheader('3.1. Paleta de Cores Semântica')
st.markdown("""
A paleta de cores é **idêntica** entre o frontend React e este dashboard Streamlit.
O mapeamento é fixo e nunca invertido:
""")

col_a, col_b, col_c = st.columns(3)
with col_a:
    st.markdown(
        "<div style='background:#10b981;padding:16px;border-radius:8px;color:white;"
        "font-weight:bold;text-align:center'>Baixo / Atenção<br>#10b981</div>",
        unsafe_allow_html=True,
    )
with col_b:
    st.markdown(
        "<div style='background:#f59e0b;padding:16px;border-radius:8px;color:white;"
        "font-weight:bold;text-align:center'>Médio / Alerta<br>#f59e0b</div>",
        unsafe_allow_html=True,
    )
with col_c:
    st.markdown(
        "<div style='background:#ef4444;padding:16px;border-radius:8px;color:white;"
        "font-weight:bold;text-align:center'>Alto / Crítico<br>#ef4444</div>",
        unsafe_allow_html=True,
    )

st.markdown("""
**Justificativa:** a consistência cromática entre interfaces reduz a carga cognitiva do
usuário — quem já viu o mapa do SIMA reconhece imediatamente o significado das cores ao
abrir o dashboard analítico. A escolha verde/âmbar/vermelho segue convenções universais
de semáforo de risco (verde = seguro, amarelo = atenção, vermelho = perigo).
""")

st.subheader('3.2. Escolha de Tipos de Gráfico')

decisoes_visuais = {
    'Distribuição por nível': {
        'Tipo': 'Barras verticais + pizza',
        'Justificativa': 'Comprimento é o canal perceptual mais preciso para comparação de magnitudes (Cleveland & McGill, 1984). Pizza complementa para destacar dominância quando há 3 categorias.',
    },
    'Top bairros': {
        'Tipo': 'Barras horizontais ordenadas',
        'Justificativa': 'Rótulos de texto longos (nomes de bairros) cabem melhor no eixo vertical. Ordenação decrescente facilita ranking. Cor codifica nível máximo — segunda variável sem adicionar dimensão.',
    },
    'Padrão horário': {
        'Tipo': 'Barras verticais (hora ordinal)',
        'Justificativa': 'Hora é variável ordinal contínua. Barra é preferível à linha quando não há interpolação significativa entre horas (não existe "hora 13,5").',
    },
    'Série temporal mensal': {
        'Tipo': 'Barras + linha de média móvel',
        'Justificativa': 'Barras mostram o dado bruto; a linha de média móvel suaviza ruído e revela tendência. Combinação é mais informativa que cada visualização isolada.',
    },
    'Regressão simples': {
        'Tipo': 'Scatter + reta de regressão',
        'Justificativa': 'Scatter mostra variabilidade individual; reta sintetiza a tendência global. R² anotado contextualiza a qualidade do ajuste sem exigir conhecimento estatístico prévio.',
    },
    'Análise de resíduos': {
        'Tipo': 'Barras verde/vermelho',
        'Justificativa': 'Cores contrastantes para resíduos positivos e negativos facilitam identificação de padrões sistemáticos de sub/superestimação.',
    },
    'Matriz de confusão': {
        'Tipo': 'Heatmap normalizado',
        'Justificativa': 'Encodes volume e acurácia simultaneamente. Diagonal dominante indica bom desempenho. Normalização por linha revela erros proporcionais, não absolutos.',
    },
    'Curva ROC': {
        'Tipo': 'Linhas por classe (One-vs-Rest)',
        'Justificativa': 'AUC resume discriminabilidade. Multi-classe OvR permite avaliar separabilidade de cada nível independentemente.',
    },
    'Importância de features': {
        'Tipo': 'Barras horizontais ordenadas',
        'Justificativa': 'Impureza de Gini traduzida em barras ordenadas revela quais variáveis o modelo mais usa. Destaque na barra principal orienta a leitura.',
    },
}

for titulo, info in decisoes_visuais.items():
    with st.expander(f'**{titulo}** — {info["Tipo"]}'):
        st.write(info['Justificativa'])

st.subheader('3.3. Princípios de Design Aplicados')

principios = [
    ('Codificação semântica de cor', 'Verde/âmbar/vermelho mapeiam para baixo/médio/alto em 100% dos gráficos — sem inversão ou uso arbitrário.'),
    ('Hierarquia tipográfica', 'Títulos em fontweight=bold, tamanho 12–13. Anotações de valor em bold menor. Texto corrido em plain sans-serif.'),
    ('Redução de ruído visual', 'Tema whitegrid (seaborn): grades discretas, sem bordas excessivas, sem efeitos 3D.'),
    ('Narrativa explícita', 'Cada gráfico acompanhado de insight textual em linguagem não-técnica — orientando o leitor que não tem formação em estatística.'),
    ('Contraste de destaque', 'O elemento com valor mais relevante recebe cor diferenciada (ex.: maior coeficiente em vermelho na regressão múltipla).'),
    ('Consistência entre plataformas', 'Paleta idêntica no React (Tailwind CSS classes) e aqui (hex direto nos plots matplotlib).'),
]

for p, desc in principios:
    st.markdown(f'**{p}:** {desc}')

# ──────────────────────────────────────────────────────────────────────────────
# 4. INSIGHTS EXTRAÍDOS
# ──────────────────────────────────────────────────────────────────────────────
st.header('4. Principais Insights Extraídos')

insights = [
    (
        'Alta severidade domina os relatos reais',
        '82,9% dos relatos coletados são de nível alto. Esse dado confirma a hipótese da '
        'pesquisa com usuários: cidadãos só reportam quando a situação já é crítica. '
        'Implica que o SIMA precisa incentivar ativamente relatos preventivos (nível baixo/médio) '
        'para ter valor preditivo real — não apenas reativo.',
    ),
    (
        'Peixinhos concentra quase metade das ocorrências',
        'Um único bairro (Peixinhos) acumula 46,3% de todos os relatos. '
        'Isso indica concentração geográfica extrema de vulnerabilidade, '
        'não distribuição uniforme. A Defesa Civil pode priorizar esse ponto com recursos limitados.',
    ),
    (
        'Pico vespertino 16h–22h',
        'O padrão horário dos dados simulados (calibrado em dados reais de chuva de Recife) '
        'mostra pico entre 16h e 22h, coincidindo com chuvas convectivas vespertinas típicas '
        'do litoral nordestino. Alertas preventivos emitidos às 15h seriam mais eficazes '
        'do que alertas reativos às 18h.',
    ),
    (
        'Regressão linear explica ~62% da variância',
        'O modelo de regressão linear múltipla (features: hora, mês, nível ordinal) alcança '
        'R² ≈ 0,62. O nível do relato é o preditor mais forte de confirmações da comunidade. '
        'A limitação é que o modelo usa dados simulados — R² no mundo real pode ser menor '
        'se a distribuição temporal não seguir o padrão simulado.',
    ),
    (
        'Classificador Random Forest: 70%+ de acurácia com features simples',
        'O Random Forest classifica nível de risco com acurácia superior a 70% usando apenas '
        'hora, mês, bairro, confirmações e denúncias. Confirmações são a feature mais importante '
        '(maior impureza de Gini). Isso valida o crowdsourcing como sinal de qualidade — '
        'não apenas como canal de coleta.',
    ),
]

for i, (titulo, texto) in enumerate(insights, 1):
    st.subheader(f'Insight {i}: {titulo}')
    st.markdown(texto)

# ──────────────────────────────────────────────────────────────────────────────
# 5. MELHORIAS INCORPORADAS (FEEDBACK)
# ──────────────────────────────────────────────────────────────────────────────
st.header('5. Melhorias Incorporadas a Partir de Feedback')

melhorias = [
    (
        'Separação visual entre dados reais e simulados',
        'Versão inicial da EDA misturava os 41 dados reais com os simulados sem marcação '
        'visual clara. Após revisão, a EDA passou a exibir análises separadas: primeiro '
        'somente os dados reais (com n explícito no título), depois a base completa — '
        'deixando transparente o que é observado e o que é modelado.',
    ),
    (
        'Narrativa textual em cada gráfico',
        'Versão inicial dos notebooks tinha apenas os gráficos sem interpretação. '
        'Após perceber que o público avaliador pode não ter contexto local (Recife, '
        'chuvas vespertinas), cada gráfico ganhou uma célula markdown de interpretação '
        'explícita do insight — orientando o leitor não-técnico.',
    ),
    (
        'Paleta semântica consistente nos notebooks',
        'Versão inicial dos notebooks usava a paleta padrão do matplotlib (azul/laranja). '
        'Após alinhar com o design do frontend React, todos os gráficos que codificam '
        'nível de risco passaram a usar o mapeamento verde/âmbar/vermelho, criando '
        'coerência visual entre as duas interfaces.',
    ),
    (
        'Declaração explícita de limitações',
        'A documentação inicial não deixava claro que os modelos de regressão e classificação '
        'usam dados simulados. Após revisão, o plano de dados (CC2) e esta página passaram '
        'a declarar explicitamente a origem de cada dataset em cada análise.',
    ),
    (
        'Filtros globais na sidebar',
        'A primeira versão do dashboard tinha filtros específicos por página, sem '
        'sincronização. A versão consolidada centralizou os filtros de período, bairro '
        'e nível na sidebar para que a seleção persista ao navegar entre páginas.',
    ),
]

for titulo, descricao in melhorias:
    with st.expander(f'**{titulo}**'):
        st.write(descricao)

# ──────────────────────────────────────────────────────────────────────────────
# 6. LIMITAÇÕES E TRABALHOS FUTUROS
# ──────────────────────────────────────────────────────────────────────────────
st.header('6. Limitações e Trabalhos Futuros')

col_lim, col_fut = st.columns(2)

with col_lim:
    st.subheader('Limitações Atuais')
    st.markdown("""
    - **Volume de dados real insuficiente:** 41 relatos limitam a validade estatística.
      Os modelos foram treinados em dados simulados e precisam ser re-validados com
      dados reais quando o sistema estiver em produção por mais tempo.
    - **Sem dados meteorológicos reais:** a integração com OpenWeather/Tomorrow.io
      ainda não foi codada. A precipitação usada na análise é sintética.
    - **Regressão linear simples:** o modelo captura tendências lineares mas não
      consegue modelar sazonalidade complexa ou eventos extremos pontuais.
    - **Classificador sem calibração de probabilidade:** o Random Forest retorna
      probabilidades que podem ser superestimadas para classes raras — calibração
      via Platt scaling seria necessária em produção.
    - **Conectividade durante chuvas:** toda a coleta de dados depende de internet
      estável — o ponto mais vulnerável do MVP, confirmado pelo questionário de usuários.
    """)

with col_fut:
    st.subheader('Trabalhos Futuros')
    st.markdown("""
    - **Integração meteorológica real:** conectar OpenWeather ou Tomorrow.io para
      substituir a precipitação sintética por dados observados e previsões.
    - **Modelo de série temporal (ARIMA/Prophet):** para capturar sazonalidade
      semanal e mensal de forma mais precisa do que a regressão linear.
    - **RNN / LSTM:** conforme o volume de dados cresce, modelos sequenciais
      podem capturar dependências temporais que a regressão linear perde.
    - **Sensores IoT integrados:** o sistema já suporta o cadastro de sensores
      (US09); conectar dados reais de réguas de nível d'água substituiria parte
      do crowdsourcing e reduziria ruído.
    - **Alertas via SMS Cell Broadcast:** alternativa ao WhatsApp para áreas com
      conectividade instável — sem necessidade de dados móveis.
    - **Mapa de calor geográfico no Streamlit:** plotar densidade de relatos por
      coordenada GPS (folium + st.components) para análise espacial mais precisa
      do que a agrupação por bairro.
    """)

# ──────────────────────────────────────────────────────────────────────────────
# 7. EQUIPE E REFERÊNCIAS
# ──────────────────────────────────────────────────────────────────────────────
st.header('7. Equipe')

st.markdown("""
**Grupo 5ºB — Cesar School, 5º Período CC:**
Artur Sales · Bruno Assunção · Caio Ferreira · Carlos Espósito ·
Felipe Marques · Samuel Abreu · Thiago Vinicius

**Orientação:** Trilha de Análise e Visualização de Dados — 5º CC

**Cliente/Parceiro:** Prefeitura do Recife

**Repositório:** [projetos5-SIMA](https://github.com/CaioLira18/projetos5-SIMA)
""")

st.markdown('---')
st.caption(
    'Dashboard analítico do SIMA · Cesar School 5º CC · '
    'Trilha de Análise e Visualização de Dados'
)
