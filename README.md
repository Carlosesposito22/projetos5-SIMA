# projetos5-SIMA

## 🌧️ **Sobre o Projeto**

O **SIMA** (Sistema Inteligente de Monitoramento e Alerta de Alagamentos) é uma plataforma hiperlocal e preventiva desenvolvida com a **Prefeitura do Recife** para que o alerta chegue ao morador *antes* da água, combinando relato comunitário e previsão por regressão linear sobre dados meteorológicos.

---

## ⭐ **Funcionalidades Principais**

### **🚨 Reporte Cidadão e Entrada de Dados (US04, US09)**

- **Registro de alagamento com geolocalização (US04):** Relato via app web com localização (manual ou GPS), nível tri-nível (baixo/médio/alto) e descrição opcional — formaliza o "olhar a calçada" citado por 43 moradores no questionário.
- **Cadastro administrativo de sensor IoT (US09):** Módulo admin para registrar sensor (identificador, tipo, coordenadas), deixando o pipeline pronto para integrar fontes físicas em complemento ao crowdsourcing.

### **🤖 Inteligência Preditiva e Análise de Dados (US07)**

- **Regressão linear sobre histórico multivariado:** Modelo `scikit-learn` que cruza relatos + precipitação + variáveis meteorológicas, serializado via `joblib` e consumido pelo Django.
- **Integração meteorológica multi-fonte:** OpenWeather (1k req/dia), Tomorrow.io (precisão GPS) e APAC, com tolerância a indisponibilidade de fonte.
- **Gatilho automático por threshold de área (US07):** Pipeline por polígono dispara alerta quando a tendência cruza o limite crítico, sem intervenção humana.

### **📱 Notificação e Comunicação Direta (US02, US05)**

- **WhatsApp Cloud API (US05):** Canal oficial da Meta com mensagem simples, mapa e nível — escolhido pelos >85% de preferência na pesquisa e tolerante à instabilidade de rede.
- **Segmentação hiperlocal (US02):** Cruza a localização do morador com o polígono da área afetada — só quem está exposto recebe o alerta.

### **🗺️ Visualização e Mapa de Risco (US01, US03)**

- **Mapa interativo em tempo real (US01):** Pontos ativos atualizados por polling HTTP (sem WebSockets, dada a instabilidade de rede), para o morador planejar a rota antes de sair.
- **Severidade tri-nível no marcador (US03):** Hierarquia visual ao estilo Google Maps — **Atenção / Alerta / Crítico** — por cor e ícone, sem ruído técnico.

### **📊 Dashboard Analítico e Trilha de Dados**

- **Painel Streamlit:** Dashboard autônomo sobre o mesmo Postgres, com EDA, séries temporais, distribuições por bairro e métricas do modelo (MAE, RMSE, R², matriz de confusão, ROC).
- **Notebooks reproduzíveis:** `01_eda` → `04_classificador` cobrem EDA, pré-processamento, regressão e classificação binária.
- **Decisões analíticas registradas:** Trade-offs explicitados (regressão sobre RNN, polling sobre WebSockets, PostgreSQL sobre NoSQL).

### **🛡️ Gestão Pública e Tomada de Decisão (US06, US08)**

- **Painel da Defesa Civil (US06):** Status agregado (Normal / Atenção / Alerta) de todas as áreas cadastradas, sem monitoramento manual contínuo.
- **Filtro por bairro/região (US08):** Recorte para priorizar áreas com maior concentração de ocorrências.
- **Histórico auditável de alertas:** Cada disparo registra origem (crowdsourcing, API, modelo), canal, nível e timestamp.

### **🔐 Identidade e Acesso (US10)**

- **Autenticação para operadores e admins (US10):** Login por usuário/senha (com WhatsApp como opção de baixa fricção), protegendo o painel da Defesa Civil e o cadastro de sensores.
- **Vínculo geográfico no cadastro:** Telefone + bairro do usuário habilitam a segmentação hiperlocal (US02).

---

> [!WARNING]
> **📦 Entregáveis da fase de ideação** — pasta [`/context`](./context):
>
> - 📽️ [Modelo de Proposição](./context/Modelo%20de%20Proposição.md)
> - 🔍 [Pesquisa Desk Research](./context/Pesquisa%20Desk%20Research.md)
> - 🧩 [Planejamento de Análise de Similares](./context/Planejamento%20Análise%20de%20Similares.md)
> - 🧠 [Jornada do Usuário](./context/Jornada%20do%20Usuário.md)
> - 🗺️ [Backlog e Histórias do Usuário](./context/Backlog.md)
>

---

## 🏛️ **Arquitetura Técnica**

Três camadas independentes conectadas pelo PostgreSQL como fonte única da verdade.

```text
┌─────────────┐         ┌──────────────────┐        ┌────────────────┐
│  Frontend   │ ──────▶ │  Django + DRF    │ ─────▶ │  PostgreSQL    │
│  (React)    │  REST   │  (API REST)      │        │                │
└─────────────┘         └──────┬───────────┘        └────────────────┘
                               │                            ▲
                               │ APIs externas              │ leitura
                               ▼                            │
                        ┌──────────────┐            ┌───────┴─────────┐
                        │  OpenWeather │            │   Streamlit     │
                        │  Tomorrow.io │            │   (dashboard    │
                        │  APAC (opt)  │            │   analítico)    │
                        └──────────────┘            └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Modelo sklearn   │
                        │ (regressão)      │
                        └──────┬───────────┘
                               │ trigger
                               ▼
                        ┌──────────────────┐
                        │ WhatsApp Cloud   │
                        │ API (Meta)       │
                        └──────────────────┘
```

### **Stack Definida**

| Camada | Tecnologia | Decisão |
| --- | --- | --- |
| **Frontend** | React.js (Vite) | Interface do produto para morador e Defesa Civil |
| **Backend** | Python + Django + DRF | Integra direto com pipeline de dados/ML |
| **Banco** | PostgreSQL | Relacional — volume controlado no MVP |
| **Análise** | pandas + matplotlib | EDA, séries temporais, correlação chuva×nível |
| **ML** | scikit-learn (regressão linear) | Interpretável e treina com pouco dado |
| **Dashboard analítico** | Streamlit | Trilha de Análise e Visualização de Dados |
| **Tempo real** | Polling HTTP | WebSockets descartado por instabilidade de rede |
| **Canal de alerta** | WhatsApp Cloud API (Meta) | 85%+ dos usuários preferiram |

---

## 📋 **Distribuição de Tarefas**

### **Histórias do Usuário por Responsável**

MVP composto por **10 USs** em 3 personas — fonte da verdade do escopo.

| US | História | Persona | Responsável |
| --- | --- | --- | --- |
| **US01** | Ver alertas no mapa | 👤 Cidadão | 🎯 *A definir* |
| **US02** | Receber notificação de alerta | 👤 Cidadão | 🎯 *A definir* |
| **US03** | Ver nível de severidade | 👤 Cidadão | 🎯 *A definir* |
| **US04** | Registrar um relato | 👤 Cidadão | 🎯 *A definir* |
| **US05** | Acessar pelo WhatsApp | 👤 Cidadão | 🎯 *A definir* |
| **US06** | Monitorar todos os pontos no dashboard | 🚨 Defesa Civil | 🎯 *A definir* |
| **US07** | Receber gatilho automático de nível crítico | 🚨 Defesa Civil | 🎯 *A definir* |
| **US08** | Filtrar alertas por bairro | 🚨 Defesa Civil | 🎯 *A definir* |
| **US09** | Cadastrar novo sensor IoT | 🔧 Administrador | 🎯 *A definir* |
| **US10** | Autenticar no sistema | 🔧 Administrador | 🎯 *A definir* |

### **Equipe — 5º B Ciência da Computação**

- 🎯 Artur Sales
- 🎯 Bruno Assunção
- 🎯 Caio Ferreira
- 🎯 Carlos Espósito
- 🎯 Felipe Marques
- 🎯 Samuel Abreu
- 🎯 Thiago Vinicius

---

> Projeto acadêmico — **Cesar School**, 5º Período de Ciência da Computação, Trilha de Análise e Visualização de Dados, em parceria com a **Prefeitura do Recife**.
