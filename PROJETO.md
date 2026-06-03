# SIMA — Contexto do Projeto

> Este arquivo carrega o contexto completo do produto: problema, persona, pesquisa e decisões de escopo. Para o contexto técnico (stack, arquitetura, código, próximos passos), ver [`TECNICO.md`](TECNICO.md).

---

## 1. Identificação

- **Nome:** SIMA — Sistema Inteligente de Monitoramento e Alerta de Alagamentos
- **Tipo:** Projeto acadêmico — Cesar School, 5º Período CC (Trilha de Análise e Visualização de Dados)
- **Cliente/Parceiro:** Prefeitura do Recife
- **Grupo (5ºB):** Artur Sales, Bruno Assunção, Caio Ferreira, Carlos Espósito, Felipe Marques, Samuel Abreu, Thiago Vinicius
- **Repositório de código:** projetos5-SIMA

---

## 2. Problema

Recife é a 5ª cidade do Brasil em população exposta a riscos naturais (>206 mil moradores em áreas de inundação, IBGE). Em maio/2022 chuvas em PE deixaram 134 mortos. **O gargalo central NÃO é falta de dados — é a ausência de um fluxo que transforme dados em ação rápida e acessível.**

Os sistemas existentes falham cada um de um jeito:

- **Defesa Civil** — alerta tarde, genérico, depende de intervenção humana
- **APAC** — dados confiáveis mas técnicos e inacessíveis ao morador
- **Cemaden** — escala nacional, sacrifica precisão local; alerta vai pra Defesa Civil, não pro cidadão
- **Waze** — reativo (precisa de alguém já no alagamento), foco em motoristas
- **AlertaBlu (Blumenau)** — similar mais próximo, mas sem IA preditiva e geograficamente limitado

**Nenhum entrega simultaneamente:** previsão antecipada + segmentação local + canal simples e direto. Esse é o espaço que o SIMA ocupa.

---

## 3. Persona

**Maria da Silva, 42, vendedora ambulante, comunidade próxima a canal em Recife-PE.**

> *"Se eu soubesse antes que a água ia subir, dava tempo de salvar minhas coisas."*

- **Dores:** falta de alertas antecipados; descobre o alagamento quando a água já está entrando; perde móveis; informação técnica não chega.
- **Sonhos:** proteger casa e família; receber informação confiável; se preparar antes.
- **Mídia principal:** WhatsApp (uso intenso). Facebook contato com família. Instagram ocasional. Rádio/TV local pra clima.

---

## 4. Pesquisa com Usuários (Questionário, 43 respostas)

Bairros: Boa Viagem, Cordeiro, Graças, Derby, Espinheiro, Imbiribeira, Casa Amarela, Ibura, Pina, Setúbal, Recife Antigo, Tamarineira, Apipucos, Janga, Aldeia, Barra de Jangada, Socorro, Areias, Ipsep, Boa Vista.

**Achados que viraram decisões de produto:**

1. **Urgência do alerta:** maioria dos afetados teve <30 min de antecedência ou foi pego de surpresa. → O problema não é falta de info, é falta de info **a tempo**.
2. **Crowdsourcing já existe informalmente:** os meios mais citados são "olhando o nível da água na calçada" e "grupos de WhatsApp de vizinhos". → O projeto formaliza e amplifica esse comportamento.
3. **WhatsApp é o canal:** **>85%** preferem alerta via WhatsApp com mapa e nível da água. → Canal principal definido.
4. **Conectividade instável durante chuva:** parte significativa relata internet caindo ou ficando lenta. → Justifica descartar WebSockets e priorizar leveza/tolerância.
5. **Maiores medos durante a chuva:** ficar preso em casa/trabalho e risco de doenças/acidentes superam a perda de móveis.

---

## 5. Proposta de Valor (MVP)

Sistema **hiperlocal, preventivo e acessível** para áreas vulneráveis do Recife. Fluxo central:

1. **Entrada (Crowdsourcing):** morador reporta alagamento pelo app → localização + nível percebido (baixo/médio/alto) + descrição opcional.
2. **Armazenamento:** banco relacional — relatos, localização, horário, histórico de alertas.
3. **Análise:** regressão linear sobre histórico de relatos + dados meteorológicos (API externa) → identifica tendência crescente de risco.
4. **Alerta:** disparo automático via **WhatsApp** para moradores cadastrados na área de risco, com linguagem simples e orientação clara.
5. **Visualização:** dashboard web com mapa interativo classificado em três níveis — **Atenção / Alerta / Emergência** — inspirado na lógica visual do Google Maps (cores, hierarquia, sem sobrecarga).

**Hipótese de sucesso:**
> Acreditamos que ao implementar alertas automatizados via WhatsApp integrados ao crowdsourcing + previsão por regressão linear, conseguiremos transformar o comportamento da população de **reativo para preventivo**, mitigando prejuízos materiais e riscos à vida.

---

## 6. Decisões Técnicas do MVP (e o porquê)

Todas tomadas sob a pergunta-filtro: **"O que é estritamente necessário para validar a solução no MVP?"**

| Decisão | Em vez de | Por quê |
| --- | --- | --- |
| **Crowdsourcing** (relato do morador) | Sensores físicos IoT (ESP-32) | Elimina custo de hardware, instalação e infraestrutura de transmissão. Comunidade já está nos pontos de risco antes de qualquer sensor. Valida engajamento antes de investir em hardware. |
| **PostgreSQL** (relacional simples) | Híbrido NoSQL + PostgreSQL | Volume de dados do MVP é controlado. Relacional resolve com menos complexidade. |
| **Regressão Linear** | RNN / Deep Learning | Treina com pouco dado, é interpretável, suficiente para identificar tendência. RNN fica como evolução futura. |
| **Polling simples** | WebSockets | WebSockets exigem conexão estável — o questionário mostra que ela cai durante chuvas. Polling é mais leve e tolerante. |
| **WhatsApp** | App mobile nativo (notificação push) | 85%+ dos usuários preferiram. App nativo exige adoção em massa. WhatsApp já está instalado. |
| **APIs meteorológicas externas** | Radares meteorológicos próprios | Custo proibitivo. OpenWeather/Tomorrow.io/APAC já dão precisão suficiente. |

### APIs avaliadas (Ideação Generativa)

- **OpenWeather** — 1.000 req/dia gratuito, REST simples, previsão 5 dias. Boa relação custo/integração.
- **Tomorrow.io** — 500 req/dia, alta precisão por coordenada GPS, ideal pra alerta hiperlocal por bairro.
- **APAC (Pernambuco)** — pública e gratuita, dados locais de rios em PE, mas formato não-padronizado (sem suporte oficial pra integração via API).

---

## 7. Escopo (MoSCoW)

### Must have

- Integração com APIs meteorológicas
- Algoritmo de gatilho (trigger) que dispara alerta ao detectar nível crítico em uma região
- Dashboard de monitoramento com status (Normal / Atenção / Alerta) por ponto

### Should have

- Filtros por bairro / tipo de risco / nível de urgência
- Gráficos de tendência (subida/descida do nível nas últimas horas)

### Could have

- Previsão de curto prazo (próximos 30 min) com modelo matemático simples

### Won't have (nesta fase)

- Hardware próprio (radares, sensores físicos)
- Deep Learning / RNNs
- WebSockets em tempo real
- App mobile nativo (web + WhatsApp cobre o MVP)

---

## 8. Backlog — Histórias do Usuário (10 USs)

O backlog do MVP é composto por **exatamente 10 histórias do usuário**, distribuídas em três personas. Esta é a fonte da verdade do escopo — qualquer feature fora dessa lista não pertence ao MVP.

> **Status atual:** ✅ entregue · 🔜 próxima fila · ⏳ pendente. Detalhes técnicos em [`TECNICO.md`](TECNICO.md) §8.

### 👤 Cidadão / Usuário Final

- ✅ **US01 — Ver alertas no mapa:** como cidadão de Recife, quero visualizar em um mapa interativo os pontos de alagamento em tempo real, para que eu possa planejar minha rota antes de sair de casa.
- ⏳ **US02 — Receber notificação de alerta:** como morador de uma área de risco, quero receber uma notificação imediata quando um alagamento for detectado no meu bairro, para que eu possa tomar uma ação preventiva com antecedência.
- ✅ **US03 — Ver nível de severidade:** como pedestre, quero saber o nível de criticidade de cada ponto (Atenção / Alerta / Crítico), para que eu consiga avaliar se é seguro passar por aquela via.
- ✅ **US04 — Registrar um relato:** como usuário do aplicativo, quero reportar manualmente um alagamento que estou presenciando, para que outras pessoas sejam avisadas mais rapidamente.
- ⏳ **US05 — Acessar pelo WhatsApp:** como cidadão que não tem o app instalado, quero receber alertas pelo WhatsApp, para que eu seja informado mesmo sem precisar baixar nada.

### 🚨 Agente da Defesa Civil / Gestor Urbano

- ✅ **US06 — Monitorar todos os pontos no dashboard:** como operador da Defesa Civil, quero visualizar um painel com o status de todos os pontos monitorados de Recife, para que eu possa coordenar as equipes de campo com agilidade.
- ⏳ **US07 — Receber gatilho automático de nível crítico:** como gestor de emergências, quero que o sistema dispare um alerta automático quando o nível da água atingir o threshold crítico, para que a resposta operacional seja iniciada sem depender de monitoramento manual constante.
- 🔜 **US08 — Filtrar alertas por bairro:** como operador, quero filtrar os alertas por bairro ou região, para que eu consiga priorizar as áreas com maior concentração de ocorrências.

### 🔧 Administrador do Sistema

- ⏳ **US09 — Cadastrar novo sensor IoT:** como administrador, quero registrar um novo sensor no sistema informando sua localização e tipo, para que ele comece a enviar dados e aparecer no mapa.
- ✅ **US10 — Autenticar no sistema:** como administrador ou operador, quero fazer login com usuário e senha (ou via WhatsApp), para que o acesso ao painel seja seguro e controlado. *(Login WhatsApp ainda pendente — só email+senha por enquanto.)*

> O arquivo histórico [`context/Backlog.md`](context/Backlog.md) contém o backlog bruto da fase de ideação (11 itens, sem agrupamento por persona) e fica preservado como artefato. O escopo vigente é o desta seção.

---

## 9. Trilha Acadêmica — Análise e Visualização de Dados (5º CC)

A entrega precisa cobrir o processo analítico completo:

- **Plano de análise:** perguntas investigativas (relação chuva × nível da água; previsibilidade de alagamentos)
- **Métricas:** descritivas, correlação estatística, regressão, classificação
- **Visualizações:** séries temporais, dispersão, matriz de confusão, curva ROC
- **Plano de dados:** dados de relatos (crowdsourcing) + meteorológicos (API) + simulados quando necessário
- **Pré-processamento:** limpeza, valores ausentes, normalização, variáveis derivadas
- **EDA:** padrões, distribuições, correlações
- **Notebooks:** modelo simples de regressão (tendências) + classificador (risco)
- **Dashboard web interativo:** filtros, hierarquia visual, documentação das decisões analíticas

---

## 10. Limitação Técnica Central (a monitorar)

Conectividade durante chuvas intensas é o maior risco operacional do MVP — todas as capacidades dependem de algum nível de internet. Isso precisa ser validado nos testes e pode justificar canais alternativos (SMS via Cell Broadcast, por exemplo) em fases futuras.

---

## 12. Referências e Pesquisa Bruta

A pasta `context/` contém todas as entregas originais da fase de ideação:

- `Modelo de Proposição.md` — proposição formal do projeto
- `Pesquisa Desk Research.md` — análise dos sistemas existentes (Defesa Civil, APAC, Cemaden, Waze, AlertaBlu) + bibliografia
- `Planejamento Análise de Similares.md` — benchmarking detalhado, matriz de funcionalidades, engenharia reversa
- `Jornada do Usuário.md` — narrativa do morador e do poder público
- `Persona.pdf` — Maria da Silva
- `Ideação Generativa.pdf` — brainstorming, eixos temáticos, comparativo de APIs
- `Seleção de ideias.pdf` — matriz impacto×esforço, MoSCoW, scorecard
- `Apresentação Projetos 5.pdf` — pitch
- `Backlog.md` + `Historias do usuario.txt` — backlog técnico
- `Matriz de Pesquisa - Matriz.tsv` — fontes secundárias (Holanda, Alerta Rio, SAISP, Ih Alagou, iNeeds, TideSat)
- `Questionário.csv` — 43 respostas brutas dos moradores
- `Planejamento Semanal.pdf` — Trello até SR2
