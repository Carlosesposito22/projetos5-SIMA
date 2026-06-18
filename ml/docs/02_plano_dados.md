# CC2 – Plano de Preparação dos Dados

**SIMA – Sistema Inteligente de Monitoramento e Alerta de Alagamentos**
Cesar School · 5º Período CC · Trilha de Análise e Visualização de Dados

---

## 1. Fontes de Dados

| # | Fonte | Tipo | Formato | Origem |
| --- | --- | --- | --- | --- |
| F1 | Relatos do SIMA | Própria | CSV exportado do PostgreSQL | Tabela `relatos` (banco SIMA) |
| F2 | Bairros de Recife | Própria | CSV exportado do PostgreSQL | Tabela `bairros` (banco SIMA) |
| F3 | Questionário de usuários | Primária | CSV do Google Forms | 42 respostas coletadas com moradores de Recife |
| F4 | Relatos simulados | Simulada | Gerado em Python (in-memory) | Script nos notebooks CC3–CC5, calibrado nas proporções reais |

### Justificativa para dados simulados

O banco real contém 41 relatos desde o lançamento do MVP. Esse volume é insuficiente para análises estatísticas robustas (regressão, classificação), que exigem mínimo de 50–100 amostras por classe. Os dados simulados são gerados com:

- **Mesmas proporções de nível** dos dados reais (alto ≈ 83%, médio ≈ 10%, baixo ≈ 7%)
- **Sazonalidade horária realista** — pesos maiores para o período 16h–23h, que coincide com chuvas vespertinas de Recife
- **Distribuição de bairros** proporcional aos pesos Dirichlet sobre os bairros reais cadastrados

A documentação final declarará explicitamente quais análises usam dados reais e quais usam simulados.

---

## 2. Descrição das Variáveis

### 2.1. Tabela `relatos` (F1)

| Variável | Tipo original | Descrição |
| --- | --- | --- |
| `id` | INTEGER | Identificador único do relato |
| `bairro_id` | INTEGER (FK) | Referência ao bairro (pode ser nulo) |
| `nivel` | VARCHAR | Severidade: `'baixo'`, `'medio'`, `'alto'` |
| `lat`, `lng` | DECIMAL(9,6) | Coordenadas geográficas do relato |
| `descricao` | TEXT | Descrição livre (opcional) |
| `created_at` | TIMESTAMP | Data e hora do registro |

### 2.2. Tabela `bairros` (F2)

| Variável | Tipo original | Descrição |
| --- | --- | --- |
| `id` | INTEGER | Identificador único |
| `nome` | VARCHAR | Nome do bairro |
| `rpa` | INTEGER | Região Político-Administrativa (1–6) |

### 2.3. Questionário (F3)

| Coluna | Conteúdo |
| --- | --- |
| `Timestamp` | Data/hora da resposta |
| Col. 2 | Frequência de alagamentos na residência |
| Col. com "canal" e "celular" | Canal preferido de recebimento de alertas |
| Cols. de dificuldade (escala 1–3) | Dificuldades enfrentadas durante chuva forte |

---

## 3. Estratégia de Limpeza

| Problema | Ocorrência | Tratamento |
| --- | --- | --- |
| `bairro_id` nulo | Relatos sem bairro associado | Mantidos nas análises temporais e por nível; excluídos de análises por bairro |
| Relatos duplicados por local/tempo | Possível múltiplo envio do mesmo evento | Identificados por raio de 50m e janela de 5 min; o mais recente é descartado |
| Datas fora do período de operação | Relatos com `created_at` antes do lançamento | Filtrados (fora do escopo operacional) |
| Valores ausentes no questionário | Perguntas opcionais sem resposta | `NaN` excluídos por pergunta antes de calcular frequências e médias |
| Variável `nivel` inconsistente | Possíveis valores fora do vocabulário | Filtrar para `{'baixo', 'medio', 'alto'}` antes de qualquer análise |

---

## 4. Transformações e Variáveis Derivadas

### 4.1. A partir de `created_at`

| Variável derivada | Fórmula | Justificativa |
| --- | --- | --- |
| `hora` | `created_at.dt.hour` | Captura padrão intradiário — chuvas de Recife são vespertinas |
| `mes` | `created_at.dt.month` | Captura sazonalidade — período chuvoso de Recife é março–agosto |
| `dia` | `created_at.dt.dayofyear` | Necessário para regressão linear sobre série temporal contínua |
| `data` | `created_at.dt.date` | Agrupamento para volume diário |

### 4.2. Codificação de variáveis categóricas

| Variável original | Variável derivada | Tipo | Justificativa |
| --- | --- | --- | --- |
| `nivel` | `nivel_num` | Ordinal (1/2/3) | `{'baixo':1, 'medio':2, 'alto':3}` — preserva a ordem natural da severidade para uso em regressão |
| `nivel` | `nivel_enc` | Inteiro (LabelEncoder) | Para classificação multiclasse — codificação `{'alto':0, 'baixo':1, 'medio':2}` (ordem alfabética do LabelEncoder) |
| `bairro` | `bairro_enc` | Inteiro (LabelEncoder) | Necessário para usar bairro como feature numérica no classificador sem criar 94 colunas dummies |

### 4.3. Variáveis de engajamento (derivadas ou simuladas)

| Variável | Origem | Fórmula / lógica | Justificativa |
| --- | --- | --- | --- |
| `confirmacoes` | Real: contagem da tabela `confirmacoes`; Simulado: Poisson(λ=4 se alto, 2 se médio, 1 se baixo) | Número de usuários que confirmaram o relato | Proxy de confiabilidade — relatos de nível alto tendem a receber mais confirmações |
| `denuncias` | Real: contagem da tabela `denuncias`; Simulado: Poisson(λ=1.2 se baixo, 0.4 senão) | Número de usuários que marcaram o relato como falso | Proxy de ruído — eventos de baixo nível são mais denunciados |

### 4.4. Enriquecimento via merge

```python
df = df_relatos.merge(
    df_bairros[['id', 'nome', 'rpa']],
    left_on='bairro_id',
    right_on='id',
    how='left'
)
df.rename(columns={'nome': 'bairro'}, inplace=True)
```

O `left join` preserva relatos sem bairro associado (bairro fica `NaN`), que são excluídos apenas nas análises que dependem de bairro.

---

## 5. Composição Final dos Datasets por Notebook

| Notebook | Dataset | Relatos reais | Relatos simulados | Total |
| --- | --- | --- | --- | --- |
| CC3 – EDA | `df_full` | 41 | 400 | 441 |
| CC4 – Regressão | `df` | 41 (insuficiente: usa simulado) | 800 | 800 |
| CC5 – Classificadores | `df` | 41 (insuficiente: usa simulado) | 800 | 800 |

O CC3 mantém os dados reais visíveis separados (41 registros) e exibe análises lado a lado com a base completa, deixando transparente o que é real e o que é simulado. O CC4 e CC5 usam apenas os 800 simulados porque 41 registros são insuficientes para treino/teste de modelos (mínimo de 50 por classe não atingido).

---

## 6. Features Finais por Modelo

### CC4 – Regressão Linear

| Feature | Tipo | Papel |
| --- | --- | --- |
| `dia` | Numérica contínua | Variável independente (regressão simples: volume/dia) |
| `nivel_num` | Ordinal 1–3 | Variável independente (regressão múltipla) |
| `hora` | Numérica discreta | Variável independente (regressão múltipla) |
| `mes` | Numérica discreta | Variável independente (regressão múltipla) |
| `confirmacoes` | Numérica discreta | **Variável dependente** (regressão múltipla) |

### CC5 – Classificadores

| Feature | Tipo | Papel |
| --- | --- | --- |
| `hora` | Numérica discreta | Variável independente |
| `mes` | Numérica discreta | Variável independente |
| `bairro_enc` | Inteiro (encoded) | Variável independente |
| `confirmacoes` | Numérica discreta | Variável independente |
| `denuncias` | Numérica discreta | Variável independente |
| `nivel_enc` | Inteiro (encoded) | **Variável dependente** (target) |

---

## 7. Decisões de Pré-processamento e Justificativas

| Decisão | Alternativa considerada | Por que esta escolha |
| --- | --- | --- |
| Complemento simulado em vez de oversampling (SMOTE) | SMOTE para balancear classes | SMOTE cria amostras sintéticas apenas nas features numéricas existentes, sem controle sobre distribuição temporal. Simulação direta permite injetar sazonalidade realista |
| LabelEncoder para bairro em vez de One-Hot | One-Hot Encoding (94 colunas) | 94 bairros gerariam matriz esparsa e overfitting. LabelEncoder é suficiente para árvore de decisão (que aprende partições), mas seria inadequado para regressão logística (trata ordinais implícitas) — trade-off aceito para manter código simples no MVP |
| `nivel_num` ordinal (1/2/3) em vez de One-Hot | One-Hot para regressão | A severidade tem ordem natural (baixo < médio < alto). Preservar essa ordem como variável ordinal é teoricamente correto e computacionalmente mais simples |
| Janela de simulação de 1 ano (2024) | 6 meses ou 2 anos | 1 ano cobre um ciclo completo de sazonalidade (período chuvoso mar–ago + seco set–fev) com volume gerenciável |
| Poisson para confirmações/denúncias | Distribuição uniforme ou normal | Contagens discretas de eventos raros seguem Poisson. λ calibrado por nível preserva a correlação esperada entre severidade e engajamento |
