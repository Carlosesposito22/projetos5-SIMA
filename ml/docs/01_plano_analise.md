# CC1 – Plano de Análise de Dados

**SIMA – Sistema Inteligente de Monitoramento e Alerta de Alagamentos**
Cesar School · 5º Período CC · Trilha de Análise e Visualização de Dados

---

## 1. Contexto e Objetivo Geral

O SIMA coleta relatos de alagamento via crowdsourcing (cidadãos reportando pelo app) e armazena dados de severidade, localização e horário em um banco PostgreSQL. O volume real disponível no MVP é de 41 relatos, complementados por 400–800 registros simulados calibrados nas mesmas proporções reais para viabilizar análises estatísticas.

O objetivo da análise é **transformar esses dados em inteligência operacional**: identificar padrões que permitam ao sistema antecipar situações de risco e orientar a Defesa Civil com evidências, não apenas com alertas reativos.

---

## 2. Perguntas de Análise

| # | Pergunta | Hipótese | Entregável |
| --- | --- | --- | --- |
| P1 | Qual é a distribuição dos relatos por nível de severidade? | A maioria dos relatos reais será de nível alto, pois cidadãos tendem a reportar apenas situações já graves | CC3 – EDA |
| P2 | Quais bairros concentram mais ocorrências e qual o nível máximo registrado por bairro? | Bairros próximos a canais e áreas de baixada terão volume e severidade maiores | CC3 – EDA |
| P3 | Existe padrão temporal nos relatos (hora do dia, mês)? | Os relatos se concentrarão no período vespertino (16h–22h), coincidindo com as chuvas de Recife | CC3 – EDA |
| P4 | É possível prever o volume de relatos ou o nível de confirmações com base em variáveis temporais e de severidade? | O nível do relato é o preditor mais forte do número de confirmações da comunidade | CC4 – Regressão |
| P5 | Um classificador simples consegue identificar o nível de risco (baixo/médio/alto) a partir das features disponíveis? | Confirmações e denúncias são sinais suficientes para classificação com acurácia acima de 60% | CC5 – Classificadores |

---

## 3. Dados Utilizados

| Fonte | Arquivo | Conteúdo |
| --- | --- | --- |
| PostgreSQL (real) | `relatos.csv` | 41 relatos reais: id, bairro_id, nivel, lat, lng, created_at |
| PostgreSQL (real) | `bairros.csv` | Bairros oficiais de Recife: id, nome, rpa |
| Questionário (primário) | `Questionário_alagamento_*.csv` | 42 respostas: frequência de alagamentos, canal preferido, dificuldades |
| Simulados | gerados em notebook | 400–800 relatos com sazonalidade e proporções calibradas nos dados reais |

---

## 4. Métricas Previstas

| Categoria | Métrica | Onde calculada |
| --- | --- | --- |
| Descritiva | Frequência e proporção por nível (%, contagem) | CC3 |
| Descritiva | Top-10 bairros por volume de relatos | CC3 |
| Descritiva | Distribuição horária e mensal dos relatos | CC3 |
| Correlação | Média de confirmações e denúncias por nível | CC3 |
| Regressão | R², RMSE, MAE do modelo linear (volume diário) | CC4 |
| Regressão | Coeficientes e R² da regressão múltipla (confirmações) | CC4 |
| Classificação | Acurácia, Precisão, Recall, F1-score por classe | CC5 |
| Classificação | AUC-ROC por classe (One-vs-Rest) | CC5 |
| Classificação | Average Precision (curva P-R) por classe | CC5 |
| Classificação | Importância de features (Gini – Árvore de Decisão) | CC5 |

---

## 5. Visualizações Planejadas e Justificativas

### 5.1. Distribuição por Nível de Severidade

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Contagem por nível | Gráfico de barras verticais | Comprimento é o canal perceptual mais preciso para comparação de magnitudes (Cleveland & McGill, 1984). Cores semânticas: verde/âmbar/vermelho reforçam o significado sem texto adicional |
| Proporção por nível | Gráfico de pizza | Aceitável para 3 categorias quando o objetivo é destacar a dominância de uma delas (82,9% alto). Complementa o barplot sem substituí-lo |

### 5.2. Bairros com Mais Relatos

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Top bairros | Barras horizontais | Rótulos de texto longos (nomes de bairros) cabem melhor no eixo vertical. Ordenação decrescente facilita ranking. Cor codifica nível máximo do bairro: segunda variável sem adicionar dimensão |

### 5.3. Padrão Temporal

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Relatos por hora (dados reais) | Barras verticais | Hora é variável ordinal contínua — barra é preferível à linha quando não há interpolação significativa entre horas |
| Relatos por hora (base completa) | Barras empilhadas por nível | Permite visualizar simultaneamente volume total e composição por severidade. Empilhamento é eficaz para 3 categorias com cores distintas |
| Relatos por mês com média móvel | Linha + barras | A linha da média móvel revela sazonalidade suavizando ruído pontual. Barras mostram o dado bruto para referência |

### 5.4. Questionário

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Frequência de alagamentos | Barras horizontais | Respostas são categorias nominais com rótulos longos. Barras horizontais facilitam leitura e comparação |
| Canal preferido de alerta | Barras horizontais | Mesmo raciocínio. Ordenação por frequência orienta priorização de decisão |
| Dificuldades durante chuva | Barras horizontais com média | Escala Likert 1–3 gera médias contínuas. Barras com destaque cromático para o maior valor orienta a leitura |

### 5.5. Confirmações e Denúncias por Nível

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Histogramas sobrepostos por nível | Histograma com alpha | Mostra distribuição completa (não só média), revelando assimetria e cauda longa em níveis altos. Sobreposição com transparência permite comparação direta |

### 5.6. Regressão

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Volume diário com linha de tendência | Scatter + reta | Scatter mostra variabilidade individual; reta de regressão sintetiza a tendência global. R² anotado contextualiza a qualidade do ajuste |
| Análise de resíduos | Gráfico de barras (positivo/negativo) | Cores contrastantes (verde/vermelho) para resíduos positivos e negativos facilitam identificação de padrões sistemáticos |
| Previsto vs. Real | Scatter com diagonal perfeita | Desvio da diagonal 45° indica sistematicamente onde o modelo erra. Mais informativo que R² isolado |
| Coeficientes da regressão múltipla | Barras horizontais | Magnitude e sinal dos coeficientes são imediatamente legíveis; cores diferenciam contribuição positiva e negativa |

### 5.7. Classificadores

| Visualização | Tipo | Justificativa perceptual |
| --- | --- | --- |
| Matriz de confusão | Heatmap | Encodes both volume and accuracy simultaneously. Diagonal dominante indica bom desempenho. Padronização por linha revela erros proporcionais |
| Métricas comparativas | Barras agrupadas | Comparação direta entre dois modelos em quatro métricas. Linha de baseline (50%) contextualiza o ganho real |
| Curva ROC por classe | Linhas por classe | AUC resume discriminabilidade. Multi-classe One-vs-Rest permite avaliar separabilidade de cada nível independentemente |
| Curva Precision-Recall | Linhas por classe | Complementa ROC em datasets desbalanceados. Average Precision sintetiza a curva inteira em um número |
| Importância de features | Barras horizontais | Impureza de Gini traduzida em barras ordenadas revela quais variáveis o modelo mais usa, com destaque na mais importante |

---

## 6. Princípios de Design Visual Aplicados

| Princípio | Como é aplicado no SIMA |
| --- | --- |
| **Paleta semântica consistente** | Verde (`#10b981`) = baixo, Âmbar (`#f59e0b`) = médio, Vermelho (`#ef4444`) = alto. Usada em todos os gráficos que codificam severidade |
| **Hierarquia tipográfica** | Títulos em `fontweight='bold'`, tamanho 12–13. Anotações de valor em bold menor. Texto de insight em plain text abaixo dos gráficos |
| **Contraste e destaque** | Barra ou classe com valor máximo destacada com cor diferenciada (ex.: barra de maior coeficiente em vermelho nas regressões) |
| **Redução de carga cognitiva** | Grades discretas (`whitegrid`), sem bordas excessivas. Legenda posicionada onde não interfere nos dados |
| **Narrativa visual** | Cada gráfico acompanhado de célula markdown com interpretação textual explícita do insight, orientando o leitor não-técnico |
