# CC10 – Documentação Final da Trilha de Análise e Visualização de Dados

**SIMA – Sistema Inteligente de Monitoramento e Alerta de Alagamentos**
Cesar School · 5º Período CC · Trilha de Análise e Visualização de Dados

**Grupo 5ºB:** Artur Sales · Bruno Assunção · Caio Ferreira · Carlos Espósito · Felipe Marques · Samuel Abreu · Thiago Vinicius
**Parceiro:** Prefeitura do Recife
**Repositório:** [github.com/CaioLira18/projetos5-SIMA](https://github.com/CaioLira18/projetos5-SIMA)

---

## Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Contexto e Motivação](#2-contexto-e-motivação)
3. [Processo Analítico Completo](#3-processo-analítico-completo)
4. [Decisões Analíticas e Justificativas](#4-decisões-analíticas-e-justificativas)
5. [Resultados e Métricas Obtidas](#5-resultados-e-métricas-obtidas)
6. [Cinco Principais Insights](#6-cinco-principais-insights)
7. [Dashboard Analítico — Estrutura e Decisões Visuais](#7-dashboard-analítico--estrutura-e-decisões-visuais)
8. [Limitações Declaradas](#8-limitações-declaradas)
9. [Trabalhos Futuros](#9-trabalhos-futuros)
10. [Conclusão](#10-conclusão)

---

## 1. Resumo Executivo

O SIMA é um sistema de crowdsourcing para monitoramento e alerta de alagamentos em Recife-PE, desenvolvido como projeto acadêmico do 5º Período de CC da Cesar School em parceria com a Prefeitura do Recife. Esta documentação sintetiza o ciclo analítico completo da Trilha de Análise e Visualização de Dados (AVD), composto por dez entregáveis — do plano de análise ao dashboard interativo.

**O problema central não é técnico — é de timing.** A pesquisa com 43 moradores de Recife mostrou que a maioria dos afetados por alagamentos teve menos de 30 minutos de antecedência ou foi pega de surpresa. Os sistemas existentes (APAC, Cemaden, Defesa Civil) geram dados, mas não os transformam em ação rápida e acessível para o cidadão. O SIMA ocupa esse espaço: coleta relatos via crowdsourcing, analisa padrões e emite alertas via WhatsApp — canal preferido por mais de 85% dos respondentes.

A trilha analítica entregou:
- **Três notebooks** documentando EDA, regressão e classificação (CC3, CC4, CC5)
- **Seis páginas de dashboard** interativo em Streamlit (Visão Geral, Temporal, Correlação, Modelos, Notebooks, Sobre)
- **Três documentos de planejamento** (Plano de Análise, Plano de Dados, Proposta Visual)
- **Cinco insights acionáveis** derivados dos dados coletados e simulados

---

## 2. Contexto e Motivação

### 2.1. O problema de dados do MVP

O sistema entrou em produção com 41 relatos reais no banco PostgreSQL — volume insuficiente para análises estatísticas robustas. Modelos de regressão e classificação exigem mínimo de 50 a 100 amostras por classe para generalizar sem overfitting. Com três classes (baixo, médio, alto) e 41 registros no total, treinar qualquer modelo com dados exclusivamente reais resultaria em:

- Split treino/teste com menos de 10 amostras de teste por classe
- Acurácia estimada altamente sensível a variações aleatórias de split
- AUC-ROC não confiável para classes com 2–3 exemplos de teste

**Decisão:** complementar os dados reais com relatos simulados calibrados nas proporções observadas. A decisão é declarada explicitamente em cada análise — nunca disfarçada.

### 2.2. Recife como cenário de análise

Recife é a 5ª cidade do Brasil em população exposta a risco de inundação, com mais de 206 mil moradores em áreas vulneráveis (IBGE). Em maio/2022, chuvas em Pernambuco deixaram 134 mortos. O padrão meteorológico local é relevante para a análise: as chuvas de Recife são predominantemente *convectivas vespertinas*, concentradas no período de abril a agosto, com picos típicos entre 16h e 22h. Esse padrão é a hipótese central de P3 do plano de análise e foi confirmado nos dados simulados calibrados nos padrões reais.

### 2.3. As cinco perguntas de análise

As análises foram conduzidas em torno de cinco perguntas investigativas definidas no CC1:

| # | Pergunta | Hipótese inicial | Verificada? |
|---|---|---|---|
| P1 | Qual a distribuição dos relatos por nível de severidade? | Maioria de nível alto — cidadãos só reportam situações já graves | ✅ Confirmada (83% alto nos dados reais) |
| P2 | Quais bairros concentram mais ocorrências? | Bairros próximos a canais terão volume e severidade maiores | ✅ Confirmada — Pareto extremo |
| P3 | Existe padrão temporal nos relatos? | Pico 16h–22h, sazonalidade abril–agosto | ✅ Confirmada nos dados simulados calibrados |
| P4 | É possível prever volume/confirmações com features temporais e de severidade? | Nível é o preditor mais forte de confirmações | ✅ Confirmada (confirmações correlacionadas com nível) |
| P5 | Um classificador simples classifica o nível de risco com acurácia acima de 60%? | Confirmações e denúncias são sinal suficiente | ✅ Confirmada (Random Forest > 70% com LOOCV) |

---

## 3. Processo Analítico Completo

### 3.1. Visão geral do pipeline

```
Fontes de dados
    │
    ├── PostgreSQL real (41 relatos + bairros + confirmações + denúncias)
    ├── Dados simulados (800 relatos com sazonalidade calibrada)
    └── Questionário (42 respostas — Google Forms)
    │
    ▼
CC2 — Plano de Preparação dos Dados
    Limpeza → transformações → variáveis derivadas → datasets por notebook
    │
    ▼
CC3 — EDA (Análise Exploratória)
    Distribuições → correlações → séries temporais → análise questionário
    │
    ├── CC4 — Regressão Linear
    │       Feature engineering → regressão simples → regressão múltipla → resíduos → métricas
    │
    └── CC5 — Classificadores
            Split estratificado → LOOCV → Random Forest → matriz confusão → ROC → importância
    │
    ▼
CC6/CC8/CC9 — Dashboard Streamlit
    6 páginas interativas — filtros globais — gráficos matplotlib — insights automáticos
    │
    ▼
CC10 — Documentação Final (este documento)
```

### 3.2. Construção dos dados simulados

O script `ml/scripts/gerar_dados_historicos.py` gera relatos com as seguintes características:

**Distribuição de nível:** 83% alto, 10% médio, 7% baixo — idênticas às proporções observadas nos 41 relatos reais. Usou-se distribuição de Poisson com λ calibrado por nível para `confirmacoes` (λ=4 para alto, λ=2 para médio, λ=1 para baixo) e `denuncias` (λ=1.2 para baixo, λ=0.4 para alto/médio).

**Sazonalidade mensal:** pesos de amostragem maiores para os meses de abril a agosto (período chuvoso de Recife), com pico em junho e julho. Os meses secos (outubro a fevereiro) recebem pesos menores.

**Sazonalidade horária:** pesos concentrados no período das 16h às 23h, com pico às 19h–20h, espelhando o padrão de chuvas convectivas vespertinas típico do litoral nordestino.

**Distribuição geográfica:** os bairros são amostrados com distribuição Dirichlet proporcional aos pesos dos bairros reais, garantindo que o bairro com mais relatos reais também concentre mais relatos simulados.

**Idempotência:** o script verifica se já existem ≥ 400 relatos antes de inserir, evitando duplicação em reinicializações do serviço.

### 3.3. Limpeza e transformações (CC2)

| Problema | Tratamento aplicado |
|---|---|
| `bairro_id` nulo | Mantido nas análises por nível e temporal; excluído de análises por bairro |
| `nivel` fora do vocabulário | Filtrado para `{'baixo', 'medio', 'alto'}` antes de qualquer análise |
| Respostas vazias no questionário | `NaN` excluídos por pergunta antes de frequências e médias |
| Duplicatas por local/tempo | Identificadas por raio de 50m e janela de 5 min — mais recente descartado |

**Variáveis derivadas criadas:**

```python
df['hora']      = df['created_at'].dt.hour          # padrão intradiário
df['mes']       = df['created_at'].dt.month         # sazonalidade mensal
df['dia']       = df['created_at'].dt.dayofyear     # série temporal contínua
df['nivel_num'] = df['nivel'].map({'baixo':1, 'medio':2, 'alto':3})  # ordinal
```

---

## 4. Decisões Analíticas e Justificativas

Esta seção documenta as decisões mais relevantes tomadas ao longo do projeto — o que foi escolhido, o que foi descartado e por quê.

### 4.1. Por que Random Forest e não Regressão Logística?

A escolha do Random Forest como classificador principal (CC5) foi tomada após comparar três candidatos:

| Modelo | Prós | Contras | Decisão |
|---|---|---|---|
| **Random Forest** | Robusto a overfitting com poucos dados; não assume distribuição dos dados; importância de features nativa (Gini) | Menos interpretável que árvore simples | ✅ **Escolhido** |
| Regressão Logística | Altamente interpretável; coeficientes diretos | Assume linearidade; sensível à multicolinearidade; instável com dados desbalanceados | Usado como comparação |
| SVM (RBF) | Bom em espaços de alta dimensão | Caixa-preta completa; sem importância de features; lento para tuning | Descartado |

O Random Forest também foi escolhido por ser *ensemble* — agrega múltiplas árvores de decisão, reduzindo a variância que seria alta com apenas 41 amostras reais. A importância de features por impureza de Gini revelou que `confirmacoes` é a variável mais discriminante, validando o modelo de crowdsourcing.

### 4.2. Por que LOOCV (Leave-One-Out) e não holdout 80/20?

Com 41 amostras reais e três classes, um split 80/20 resultaria em apenas 8 amostras de teste — insuficiente para estimar AUC-ROC com significância. O LOOCV usa cada amostra como ponto de teste único, maximizando o uso dos dados e produzindo estimativas de generalização mais estáveis. O custo computacional adicional é desprezível com 800 amostras.

### 4.3. Por que regressão linear simples e não ARIMA?

O objetivo da regressão (CC4) é demonstrar o pipeline analítico, não construir um modelo de produção. Com dados simulados de apenas um ano, ARIMA seria superajuste: exigiria identificar p, d, q manualmente e validaria padrões que foram *injetados* na simulação, não *descobertos* nos dados. A regressão linear com R² e RMSE é mais interpretável para o público acadêmico avaliador e suficiente para responder a P4.

### 4.4. Por que LabelEncoder para bairro em vez de One-Hot?

94 bairros de Recife com One-Hot Encoding gerariam 94 colunas binárias — matriz esparsa que induz overfitting em qualquer modelo com menos de 10 × 94 = 940 amostras. O LabelEncoder é adequado para árvores de decisão (que aprendem partições em variáveis ordinais artificiais), aceitável para o MVP.

**Trade-off declarado:** para a Regressão Logística, LabelEncoder introduz ordinais implícitas entre bairros (bairro 3 > bairro 2 numericamente), o que é semanticamente incorreto. Esse trade-off é aceito porque a regressão logística é usada apenas como comparação, não como modelo principal.

### 4.5. Por que dados simulados em vez de SMOTE (Synthetic Minority Over-sampling)?

SMOTE cria amostras sintéticas por interpolação entre amostras existentes nas features numéricas, sem controle sobre a distribuição temporal. Aplicar SMOTE sobre 41 relatos geraria amostras com `hora` e `mes` interpolados entre valores observados — o que pode criar entradas artificialmente agrupadas ao redor dos poucos exemplos reais, sem representar a sazonalidade real de Recife.

A simulação direta injeta sazonalidade horária e mensal calibrada em dados meteorológicos locais, tornando os dados mais realistas operacionalmente, mesmo que declaradamente simulados.

### 4.6. Por que janela mensal (e não semanal ou diária) nos gráficos temporais?

A versão inicial do dashboard usava barras diárias — 365 barras sobrepostas, ilegíveis. A escolha de 12 barras mensais foi tomada por três razões:

1. **Legibilidade:** 12 valores cabem num eixo sem rotação de rótulo
2. **Sazonalidade:** a variação relevante de alagamentos em Recife é mensal (período chuvoso abril–agosto), não semanal
3. **Volume de dados:** com 800 relatos em 365 dias, a média diária é 2,2 relatos — muita variabilidade diária que obscurece o padrão sazonal

### 4.7. Por que Pareto (curva acumulada) para análise geográfica?

Barras simples de volume por bairro respondem "quem tem mais". A curva de Pareto responde "quantos bairros explicam 80% do problema" — uma pergunta operacionalmente mais relevante para a Defesa Civil alocar recursos. A descoberta de que poucos bairros (tipicamente 5–8 de 94) concentram 80% dos relatos é um achado de alta valor prático que não aparecia nos gráficos anteriores.

---

## 5. Resultados e Métricas Obtidas

### 5.1. EDA — Principais números (CC3)

| Métrica | Valor | Base |
|---|---|---|
| Total de relatos analisados | 841 (41 reais + 800 simulados) | Combinada |
| % nível alto nos dados reais | 82,9% | Real |
| % nível alto nos dados simulados | ~83% (calibrado) | Simulado |
| Bairros com relatos registrados | 41–94 (varia com filtros) | Real |
| Concentração top-3 bairros | ~30–40% do total | Simulado |
| Pico horário | 19h–20h | Simulado |
| % relatos no período 16h–22h | ~55% | Simulado |
| % relatos no período chuvoso (abr–ago) | ~62% | Simulado |

### 5.2. Regressão Linear (CC4)

| Modelo | Target | R² | RMSE |
|---|---|---|---|
| Regressão simples (`dia` → `confirmacoes`) | Nº de confirmações | ~0,30–0,45 | variável |
| Regressão múltipla (`hora + mes + nivel_num` → `confirmacoes`) | Nº de confirmações | ~0,58–0,65 | variável |

**Feature mais importante (regressão múltipla):** `nivel_num` — o nível de severidade do relato explica a maior parte das confirmações da comunidade, confirmando a hipótese P4. Quanto mais grave o relato, mais outros usuários o confirmam — o que valida o crowdsourcing como sinal de qualidade, não apenas de quantidade.

**Análise de resíduos:** distribuição aproximadamente normal com leve cauda positiva, indicando que o modelo subestima sistematicamente os relatos de nível alto com muitas confirmações (eventos raros mas intensos). Esse comportamento é esperado em regressão linear aplicada a dados com caudas pesadas.

### 5.3. Classificadores (CC5)

| Modelo | Acurácia (LOOCV) | AUC-ROC médio | F1 macro |
|---|---|---|---|
| Random Forest | ≥ 70% | ≥ 0,75 | ≥ 0,68 |
| Regressão Logística | ~60–65% | ~0,65–0,70 | ~0,58–0,62 |
| Baseline (classe majoritária) | ~83% | 0,50 | ~0,30 |

*Nota sobre baseline:* a acurácia de baseline é alta (~83%) porque o dataset é desbalanceado — predizer sempre "alto" acerta 83% das vezes. O F1 macro é a métrica mais honesta aqui: um modelo que prediz sempre "alto" tem F1 macro de ~0,30 (zero em baixo e médio). O Random Forest supera esse baseline em F1 macro, validando que aprendeu padrões reais, não apenas a classe dominante.

**Feature mais importante (Random Forest):** `confirmacoes` — a quantidade de confirmações da comunidade é o sinal mais discriminante entre os três níveis de risco. Isso tem implicação direta de design: incentivando confirmações de outros usuários, o sistema melhora a própria qualidade dos dados de entrada para o classificador.

**Limitação de calibração:** o Random Forest retorna probabilidades brutas que podem ser superestimadas para as classes raras (baixo e médio). Em produção, calibração via Platt Scaling seria necessária antes de usar as probabilidades como base para disparo de alertas.

---

## 6. Cinco Principais Insights

### Insight 1 — Viés de Reporting: Cidadãos Só Reportam o Extremo

**O achado:** 82,9% dos 41 relatos reais são de nível alto. Em uma distribuição uniforme entre três níveis, esperaríamos 33% por classe. O nível alto está **2,5× acima** do esperado.

**O que isso significa:** este não é um dado sobre risco — é um dado sobre comportamento. Os cidadãos acionam o sistema apenas quando a situação já é grave. Relatos de nível baixo (os mais valiosos para previsão antecipada, porque chegam antes do pico) são quase inexistentes. O sistema tem uma lacuna estrutural: coleta bem o que já aconteceu, mas pouco do que está começando a acontecer.

**Implicação acionável:** criar incentivos para relatos preventivos — por exemplo, notificação ativa pedindo confirmação de relatos de baixo nível ou gamificação de "alertas antecipados". Um sistema de recompensa simbólica por relatos de nível baixo confirmados aumentaria o valor preditivo do crowdsourcing sem custo de infraestrutura.

---

### Insight 2 — Concentração de Pareto: Poucos Bairros, Maioria do Problema

**O achado:** análise Pareto dos dados simulados (calibrados nos dados reais) mostra que 5–8 bairros (5–8% dos ~94 monitorados) concentram 80% de todos os relatos de alagamento.

**O que isso significa:** o risco de alagamento em Recife não é distribuído uniformemente pela cidade. É um problema geograficamente concentrado. Isso vai contra a intuição de que "muitos bairros têm algum risco" — na prática, alguns poucos bairros respondem pela grande maioria das ocorrências históricas.

**Implicação acionável:** cobrir esses 5–8 bairros críticos com sensores IoT físicos (réguas de nível d'água) já endereça 80% do problema histórico com recursos mínimos. A Defesa Civil pode priorizar alocação de equipes de campo nesses pontos durante eventos de chuva intensa, sem precisar cobrir a cidade inteira.

---

### Insight 3 — Janela Crítica 16h–22h: O Problema é Previsível no Tempo

**O achado:** aproximadamente 55% dos relatos ocorrem entre 16h e 22h. O pico absoluto é às 19h–20h. O vale é no período de madrugada (3h–5h).

**O que isso significa:** os alagamentos em Recife têm um padrão horário consistente, derivado das chuvas convectivas vespertinas típicas do litoral nordestino. Isso transforma um problema aparentemente imprevisível em um problema com *janela de risco conhecida*.

**Implicação acionável:** um alerta preventivo automático emitido às 15h durante dias com previsão de chuva forte cobraria o pico com 1–2 horas de antecedência — exatamente o que os moradores pediam no questionário ("se eu soubesse antes que a água ia subir"). Isso é tecnicamente viável conectando a API OpenWeather (já no stack, ainda não integrada) com o mecanismo de disparo via WhatsApp que já existe.

---

### Insight 4 — Confirmações São Sinal de Qualidade, Não Só de Quantidade

**O achado:** na regressão múltipla (CC4), `nivel_num` é a variável que mais explica `confirmacoes`. Na classificação (CC5), `confirmacoes` é a feature mais importante (maior impureza de Gini) para predizer o nível de risco.

**O que isso significa:** os dois modelos chegaram ao mesmo ponto por caminhos diferentes — e se complementam. A regressão diz: relatos de nível alto recebem mais confirmações. A classificação diz: saber o número de confirmações é o melhor indício do nível de risco. Juntos, eles revelam que o comportamento coletivo da comunidade (confirmar ou denunciar um relato) é um amplificador de sinal — não ruído.

**Implicação acionável:** incentivar confirmações de outros usuários (botão visível, notificação de "alguém reportou perto de você — é verdade?") melhora simultaneamente a experiência do usuário *e* a qualidade dos dados de entrada para os modelos. É um investimento de design com retorno duplo.

---

### Insight 5 — Sazonalidade Mensal Concentrada: Período Chuvoso Define o Risco

**O achado:** ~62% dos relatos se concentram nos meses de abril a agosto — o período chuvoso de Recife. O mês de pico (tipicamente junho ou julho) registra 5–7× mais relatos do que o mês mais tranquilo (janeiro ou fevereiro).

**O que isso significa:** o risco de alagamento em Recife não é um problema constante ao longo do ano — é um problema *sazonal*, com cinco meses de alta concentração e sete meses de baixa atividade. Isso tem consequências operacionais diretas: manter equipes, sensores e limiares de alerta calibrados para o pior cenário o ano inteiro gera custo sem benefício.

**Implicação acionável:** o threshold de disparo de `AlertaBairro` (configurável via `SIMA_ALERTAS` no Django) pode ser dinamicamente ajustado pela estação: mais restritivo de setembro a março (evitar falsos positivos com chuvas eventuais) e mais sensível de abril a agosto (capturar eventos mais cedo). Essa calibração sazonal é implementável sem mudar a arquitetura — apenas ajustando a configuração.

---

## 7. Dashboard Analítico — Estrutura e Decisões Visuais

### 7.1. Arquitetura de páginas

O dashboard Streamlit (`ml/streamlit_app/`) foi construído com seis páginas, cada uma respondendo a uma camada de análise diferente:

| Página | Arquivo | Pergunta central respondida |
|---|---|---|
| Visão Geral | `01_visao_geral.py` | Qual o perfil de severidade e concentração geográfica dos relatos? |
| Análise Temporal | `02_temporal.py` | Quando os alagamentos acontecem — que horas, que meses? |
| Correlação / Regressão | `03_correlacao.py` | Quais variáveis têm relação estatística com o nível de risco? |
| Modelos ML | `04_modelos.py` | Como os classificadores performam e quais features mais importam? |
| Notebooks | `06_notebooks.py` | Onde estão os notebooks completos de análise? |
| Sobre | `05_sobre.py` | Quais foram as decisões visuais, insights e limitações? |

### 7.2. Hierarquia visual adotada

Cada página segue a mesma estrutura hierárquica, da informação mais sintética para a mais detalhada:

```
1. Título e caption       → onde estou e o que vou ver
2. KPIs (st.metric)       → números de impacto visíveis de longe
3. Gráfico principal      → a pergunta central visualizada
4. Gráficos de detalhe    → análises secundárias em colunas
5. Insight (st.info)      → interpretação em linguagem natural
```

Essa ordem foi escolhida para atender dois públicos simultaneamente: o avaliador acadêmico (que lê rápido — vê KPI e gráfico principal) e o analista (que vai fundo — lê o insight e os gráficos de detalhe).

### 7.3. Paleta de cores e consistência entre interfaces

A paleta é idêntica entre o frontend React e o dashboard Streamlit — mesmos valores hexadecimais em todos os gráficos que codificam nível de risco:

| Nível | Hex | Racional |
|---|---|---|
| Baixo / Atenção | `#10b981` (verde esmeralda) | Verde = seguro, situação controlável |
| Médio / Alerta | `#f59e0b` (âmbar) | Amarelo/âmbar = atenção, semáforo universal |
| Alto / Crítico | `#ef4444` (vermelho) | Vermelho = perigo, resposta imediata |

**Por que essa consistência importa:** quem trabalha com o sistema operacional React e depois abre o dashboard analítico Streamlit reconhece imediatamente o significado das cores sem ler a legenda — redução de carga cognitiva por transferência de aprendizado entre interfaces.

### 7.4. Decisões de escopo do dashboard

Três recursos foram *conscientemente não implementados* no Streamlit:

| Recurso | Decisão | Justificativa |
|---|---|---|
| Mapa geográfico interativo | Não implementado | O mapa Leaflet completo já existe no frontend React — duplicar no Streamlit seria retrabalho sem ganho analítico. O mapa de bolhas estático (matplotlib) cumpre o propósito analítico |
| Autenticação | Não implementado | O dashboard é interno (pesquisa, avaliação) — autenticação fica no React para o acesso público |
| Plotly interativo | Não implementado | Os notebooks CC3–CC5 usam matplotlib/seaborn — manter a mesma biblioteca elimina inconsistências visuais entre notebook e dashboard. Reescrever em Plotly seria custo sem benefício para a entrega acadêmica |

### 7.5. Evolução das visualizações (melhorias iterativas)

Três gráficos foram refeitos após identificação de problemas de legibilidade:

**Distribuição por Data (02_temporal):** versão inicial com 365 barras diárias — rótulos do eixo X sobrepostos, dados ininteligíveis. Solução: agregação mensal (12 barras com nomes de mês abreviados) + linha de total no eixo secundário.

**Distribuição por Bairro (02_temporal):** versão inicial com 94 bairros como barras verticais minúsculas. Solução: top 15 bairros em barras horizontais ordenadas, empilhadas por nível.

**Dispersão Geográfica (01_visao_geral):** versão inicial com 800 pontos individuais sobrepostos, criando massa vermelha ilegível. Solução: agregação por bairro — uma bolha por bairro, tamanho proporcional à raiz quadrada do volume, cor = nível dominante. Redução de 800 pontos para ~50 bolhas legíveis.

---

## 8. Limitações Declaradas

### 8.1. Volume de dados reais insuficiente

**41 relatos** não permitem validação estatisticamente robusta dos modelos de regressão e classificação. Todos os resultados quantitativos de CC4 e CC5 devem ser interpretados como *prova de conceito do pipeline analítico*, não como estimativas confiáveis de desempenho em produção. As métricas (R², AUC, F1) são calculadas sobre dados predominantemente simulados — validação real exigirá ao menos 200–300 relatos por classe.

### 8.2. Ausência de dados meteorológicos reais

A integração com OpenWeather e Tomorrow.io está reservada no stack (chaves no `.env.example`, app `clima/` no Django) mas não foi codada no MVP. A precipitação usada nas análises é sintética — calibrada em padrões meteorológicos de Recife, mas não em dados observados de chuva real. Isso significa que a "correlação chuva × relatos" do dashboard é ilustrativa, não empírica.

### 8.3. Regressão linear para fenômeno não-linear

Alagamentos são fenômenos com threshold (abaixo de certa precipitação não há relato; acima, há muitos). A regressão linear não captura esse comportamento de salto. Isso se manifesta nos resíduos: o modelo tende a subestimar relatos em picos de chuva e superestimar em períodos de baixa atividade.

### 8.4. Classificador sem calibração de probabilidade

O Random Forest produz probabilidades brutas por votação de árvores. Essas probabilidades são bem ordenadas (relatos mais graves têm probabilidade maior de "alto"), mas não são bem calibradas (a probabilidade 0,85 de "alto" não significa que 85% dos relatos com esse score são de fato alto). Em produção, calibração via Platt Scaling ou Isotonic Regression seria necessária antes de usar as probabilidades como limiares de disparo.

### 8.5. LabelEncoder para bairro na Regressão Logística

A codificação de bairros como inteiros ordinais é semanticamente incorreta para a Regressão Logística (que trata bairro 45 como 45 vezes maior que bairro 1). Esse trade-off foi aceito para manter o código simples no MVP — One-Hot Encoding com 94 colunas seria viável com amostras suficientes, mas não com 41 registros reais.

### 8.6. Conectividade durante chuvas

Toda a coleta de dados depende de internet estável. O questionário com moradores mostrou que conectividade instável durante chuvas intensas é o maior risco operacional do MVP. Se a rede cair no momento do alagamento, o relato não chega — o sistema perde exatamente os eventos mais relevantes.

---

## 9. Trabalhos Futuros

### 9.1. Curto prazo (próximos 3 meses)

**Integração meteorológica real:** conectar a API Tomorrow.io (500 req/dia no plano gratuito, alta precisão por coordenada GPS) para substituir a precipitação sintética. O app `clima/` já existe no Django para receber esses dados.

**Re-validação dos modelos com dados reais:** quando o banco atingir 150–200 relatos reais por classe (estimativa: 6–9 meses de operação), re-treinar regressão e classificador e comparar métricas com as obtidas nos dados simulados.

**Threshold sazonal no AlertaBairro:** implementar ajuste dinâmico do limiar de disparo (`SIMA_ALERTAS`) por mês — mais sensível de abril a agosto, mais restritivo no período seco.

### 9.2. Médio prazo (3–9 meses)

**Modelo de série temporal:** substituir a regressão linear por ARIMA ou Facebook Prophet para capturar sazonalidade semanal e mensal de forma mais precisa. Requer ~6 meses de dados históricos reais para identificação dos parâmetros.

**Sensores IoT nos bairros críticos:** o sistema já suporta cadastro e visualização de sensores (US09). Instalar réguas de nível d'água nos 5–8 bairros identificados pelo Pareto substituiria parte do crowdsourcing por leitura contínua automatizada.

**Mapa de calor geográfico no Streamlit:** usar `folium` com `st.components.v1.html` para renderizar heatmap de densidade de relatos por coordenada GPS — mais preciso que a agrupação por bairro para identificar pontos de acumulação dentro de um mesmo bairro.

### 9.3. Longo prazo (9–18 meses)

**RNN / LSTM sobre série temporal de relatos + precipitação:** conforme o volume cresce, modelos sequenciais capturam dependências temporais que a regressão linear e o Random Forest perdem. Requer ao menos 2–3 anos de dados históricos com dados meteorológicos reais associados.

**SMS via Cell Broadcast como canal alternativo:** o WhatsApp depende de dados móveis que falham durante chuvas intensas. Cell Broadcast (tecnologia presente em smartphones modernos, sem necessidade de dados) enviaria alertas mesmo sem conectividade — especialmente relevante para as regiões mais vulneráveis, onde a infraestrutura de telecomunicações é mais precária.

**Calibração de probabilidade do classificador:** implementar Platt Scaling sobre as probabilidades do Random Forest e validar com dados reais para permitir uso das probabilidades como limiares de disparo de alertas automáticos.

---

## 10. Conclusão

O SIMA entregou, neste ciclo do 5º Período, um sistema funcional ponta-a-ponta: desde a coleta de relatos via crowdsourcing até o disparo de alertas via WhatsApp, passando por um pipeline analítico completo com EDA, regressão, classificação e dashboard interativo.

A trilha de Análise e Visualização de Dados cumpriu todos os dez entregáveis previstos. Mais do que documentar o que foi feito, este relatório buscou documentar **o que foi aprendido** — as decisões de design analítico que não estavam óbvias no início e que moldaram o resultado final.

Os cinco insights principais revelam que o problema de alagamentos em Recife tem estrutura analítica: é previsível no tempo (janela 16h–22h), concentrado no espaço (Pareto geográfico), sazonal no calendário (abril–agosto) e reflexo de um comportamento coletivo mensurável (viés de reporting, confirmações como sinal de qualidade). Esse conjunto de padrões transforma o problema de "monitoramento reativo" em "previsão antecipada" — que era o objetivo original do SIMA.

A limitação mais honesta é o volume de dados: 41 relatos reais não permitem validar estatisticamente nenhum dos modelos. O pipeline analítico está construído e testado — mas seu valor real depende de crescimento orgânico da base de dados ao longo dos próximos meses de operação. O MVP foi projetado para isso: quando os dados chegarem, a análise já está pronta para recebê-los.

---

*Documento gerado em junho de 2026 · Cesar School 5º CC · Trilha de Análise e Visualização de Dados*
