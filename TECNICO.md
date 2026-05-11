# SIMA — Contexto Técnico (Código & Estrutura)

> Para o contexto do produto (problema, persona, pesquisa, decisões de escopo), ver [`PROJETO.md`](PROJETO.md).
>
> **Status do repositório:** vazio. Apenas `README.md` existe. A fase de implementação está começando agora — este arquivo descreve as decisões tomadas na ideação e deve ser atualizado conforme o código nascer.

---

## 1. Stack Definida

| Camada | Tecnologia | Notas |
|---|---|---|
| **Frontend** | React.js | Vue foi cogitado mas React é a referência do backlog. |
| **Backend** | **Python + Django** | Django REST Framework para a API. Python integra direto com o pipeline de dados/ML. |
| **Banco** | PostgreSQL | Decisão consciente de NÃO usar NoSQL no MVP — volume controlado, relacional cobre. |
| **Análise de dados** | **pandas + matplotlib** | EDA, séries temporais, correlação chuva×nível, gráficos da trilha de dados. |
| **ML** | **scikit-learn** (regressão linear) | Modelo simples e interpretável; treina com pouco dado. `statsmodels` opcional para testes estatísticos. |
| **Dashboard analítico** | **Streamlit** | Painel separado pra trilha de dados — entrega visualizações, filtros e modelo treinado direto do notebook. Complementa o frontend React (que é a interface do produto). |
| **Comunicação tempo real** | Polling HTTP simples | **NÃO** usar WebSockets no MVP (questionário mostrou conectividade instável durante chuvas). |
| **Canal de alerta** | **WhatsApp Cloud API (Meta)** | 85%+ dos usuários preferiram. API oficial da Meta — gratuita até 1.000 conversas/mês iniciadas pelo negócio, requer App no Meta for Developers e número verificado. |
| **APIs meteorológicas** | OpenWeather + Tomorrow.io + (APAC se viável) | OpenWeather: 1k req/dia. Tomorrow.io: 500 req/dia, melhor precisão GPS. APAC: dados de rios PE, mas integração frágil. |
| **Deploy** | _A definir_ | Decisão adiada — alinhar mais pra frente conforme o produto for tomando forma. |

**Sobre Streamlit vs React:** os dois convivem. **React** é o produto pra Maria/Defesa Civil (mapa, reportar alagamento, receber alerta). **Streamlit** é o dashboard analítico exigido pela trilha de Análise e Visualização de Dados — fica mais próximo dos notebooks, com filtros, gráficos e o modelo de regressão. Não há motivo pra reimplementar a análise no React.

---

## 2. Arquitetura Proposta (Alto Nível)

```
┌─────────────┐         ┌──────────────────┐        ┌────────────────┐
│  Frontend   │ ──────▶ │  Django + DRF    │ ─────▶ │  PostgreSQL    │
│  (React)    │  REST   │  (API REST)      │        │                │
└─────────────┘         └──────┬───────────┘        └────────────────┘
       │                       │                            ▲
       │ Polling                │ APIs externas              │ leitura
       │ (mapa/alertas)         ▼                            │
       │                ┌──────────────┐            ┌────────┴────────┐
       │                │  OpenWeather │            │   Streamlit     │
       │                │  Tomorrow.io │            │   (dashboard    │
       │                │  APAC (opt)  │            │   analítico —   │
       │                └──────────────┘            │   trilha dados) │
       │                       │                    └─────────────────┘
       │                       ▼
       │                ┌──────────────────┐
       │                │ Modelo sklearn   │ ◀── treinado em notebook,
       │                │ (regressão)      │     carregado pelo Django
       │                │ joblib serializa │     via joblib.load()
       │                └──────┬───────────┘
       │                       │ trigger
       │                       ▼
       │                ┌──────────────────┐
       │                │ WhatsApp Cloud   │
       │                │ API (Meta)       │
       │                └──────────────────┘
       ▼
   Interface web (mapa + lista + filtros + reportar)
```

**Fluxo principal (MVP):**
1. Morador reporta alagamento via app web → `POST /api/relatos/` (Django REST Framework).
2. Backend grava no Postgres (lat, lng, nível, timestamp, user_id) via Django ORM.
3. Job periódico (Django management command + cron, ou Celery beat) consulta API meteorológica + relatos recentes da região.
4. Modelo sklearn (regressão linear, serializado com `joblib`) estima tendência de risco da área.
5. Se tendência cruza threshold crítico → service dispara alerta via WhatsApp Cloud API pros usuários cadastrados naquele raio.
6. Frontend React atualiza mapa por polling (5–30s) com classificação Atenção / Alerta / Emergência.
7. Em paralelo, **Streamlit** lê o mesmo banco e expõe o dashboard analítico da trilha de dados (EDA, séries temporais, métricas do modelo, filtros por bairro/período).

---

## 3. Estrutura de Pastas Sugerida

Esqueleto Django + React + Streamlit:

```
projetos5-SIMA/
├── frontend/                       # React (Vite)
│   ├── src/
│   │   ├── pages/                  # Login, Dashboard, MapaRisco, Reportar
│   │   ├── components/             # Mapa, AlertaCard, Filtros
│   │   ├── services/               # client HTTP (axios)
│   │   └── hooks/
│   └── package.json
│
├── backend/                        # Django + DRF
│   ├── manage.py
│   ├── sima/                       # projeto Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/                       # apps Django (modular)
│   │   ├── users/                  # autenticação e perfil (US10)
│   │   ├── relatos/                # crowdsourcing — relato manual (US04)
│   │   ├── alertas/                # mapa, notificação, gatilho, filtros (US01–US03, US06–US08)
│   │   ├── areas_risco/            # bairros, polígonos, thresholds
│   │   ├── sensores/               # cadastro de sensor IoT (US09)
│   │   └── clima/                  # integração OpenWeather/Tomorrow/APAC
│   ├── services/                   # camada de serviço
│   │   ├── whatsapp_cloud.py       # cliente WhatsApp Cloud API
│   │   ├── ml_predict.py           # carrega modelo joblib e prevê risco
│   │   └── trigger_alerta.py       # orquestra: previsão → WhatsApp
│   ├── requirements.txt
│   └── tests/
│
├── ml/                             # trilha de Análise/Visualização de Dados
│   ├── notebooks/
│   │   ├── 01_eda.ipynb            # exploração, distribuições, correlação
│   │   ├── 02_preprocessing.ipynb  # limpeza, valores ausentes, normalização
│   │   ├── 03_regressao.ipynb      # modelo, métricas (MAE, RMSE, R²)
│   │   └── 04_classificador.ipynb  # risco binário, matriz confusão, ROC
│   ├── data/                       # CSVs (gitignored se sensível)
│   ├── models/                     # joblib do modelo treinado
│   └── streamlit_app/
│       ├── app.py                  # entrypoint do dashboard
│       └── pages/                  # multi-page Streamlit
│
├── docs/                           # opcional — diagramas, ADRs
└── README.md
```

---

## 4. Modelo de Dados (Esboço)

Derivado das histórias do usuário. Schema relacional mínimo:

```sql
-- Usuários (cidadão, defesa civil, admin)
users (
  id PK,
  nome,
  email UNIQUE,
  senha_hash,
  telefone,           -- pra WhatsApp
  bairro,             -- área principal de monitoramento
  lat, lng,
  role,               -- 'cidadao' | 'defesa_civil' | 'admin'
  created_at
)

-- Relatos de alagamento (crowdsourcing — US04)
relatos (
  id PK,
  user_id FK,
  lat, lng,
  bairro,
  nivel,              -- 'baixo' | 'medio' | 'alto'
  descricao,
  created_at
)

-- Sensores IoT cadastrados pelo administrador (US09)
sensores (
  id PK,
  identificador UNIQUE,  -- código do equipamento
  tipo,                  -- 'nivel_agua' | 'pluviometro' | 'camera' | ...
  bairro,
  lat, lng,
  status,                -- 'ativo' | 'inativo' | 'manutencao'
  cadastrado_por FK,     -- users.id (admin)
  cadastrado_em
)

-- Alertas disparados pelo sistema
alertas (
  id PK,
  area_id,            -- referência à área de risco
  bairro,
  nivel,              -- 'atencao' | 'alerta' | 'emergencia'
  origem,             -- 'crowdsourcing' | 'api_meteo' | 'modelo_ml'
  mensagem,
  enviado_em,
  canal               -- 'whatsapp' | 'email' | 'app'
)

-- Áreas de risco monitoradas (bairros, ruas, polígonos)
areas_risco (
  id PK,
  nome,
  bairro,
  poligono_geojson,
  threshold_critico
)

-- Histórico meteorológico (cache de APIs externas)
clima_historico (
  id PK,
  fonte,              -- 'openweather' | 'tomorrow' | 'apac'
  lat, lng,
  precipitacao_mm,
  umidade,
  vento,
  coletado_em
)
```

A tabela `clima_historico` + `relatos` formam o dataset de treino da regressão linear.

---

## 5. Convenções de Código

- **Idioma:** comentários e nomes de variáveis em **português**; mensagens de UI em **português**.
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- **Branches:** `main` protegida; trabalho em `feature/<nome>` ou `fix/<nome>`.
- **Linter/formatter Python:** `black` (formatter) + `isort` (imports) + `ruff` ou `flake8` (lint). Configurar `pyproject.toml`.
- **Linter/formatter Frontend:** ESLint + Prettier.
- **Variáveis sensíveis:** sempre em `.env` (chaves OpenWeather, Tomorrow.io, **WhatsApp Cloud API token + phone_number_id**, `SECRET_KEY` do Django). Nunca commitar. Usar `django-environ`.

---

## 6. Plano da Trilha de Análise de Dados

A trilha do 5º CC exige entregáveis específicos que devem viver na pasta `ml/`:

1. **Plano de análise** — perguntas investigativas documentadas (markdown).
2. **EDA notebook** — distribuição de relatos por bairro, correlação chuva×nível, séries temporais.
3. **Modelo de regressão** — treino, métricas (MAE, RMSE, R²), serialização (`joblib` ou `pickle`).
4. **Modelo classificador** — risco binário (alagará / não alagará nas próximas N horas), métricas de classificação (matriz de confusão, curva ROC).
5. **Dashboard web** — integrado ao frontend principal, com filtros e visualizações.
6. **Documentação das decisões analíticas** — ADRs simples ou seção no README.

---

## 7. Próximos Passos Imediatos (Fase 2)

1. **Inicializar Django:** `django-admin startproject sima backend/` + `pip install django djangorestframework psycopg2-binary python-decouple django-cors-headers`.
2. **Criar apps:** `python manage.py startapp users relatos alertas areas_risco clima` (cada um na pasta `apps/`).
3. **Inicializar React:** `npm create vite@latest frontend -- --template react`.
4. **Setup ML:** `pip install pandas scikit-learn matplotlib statsmodels joblib jupyter streamlit` num venv separado (ou `requirements-ml.txt`).
5. **Provisionar PostgreSQL:** local via Docker (`postgres:16`) e configurar no `settings.py`.
6. **Cadastrar credenciais externas em `.env.example`:**
   - `OPENWEATHER_API_KEY=`
   - `TOMORROW_API_KEY=`
   - `WHATSAPP_CLOUD_TOKEN=` (Meta — token permanente do app)
   - `WHATSAPP_PHONE_NUMBER_ID=` (id do número do WhatsApp Business)
   - `WHATSAPP_VERIFY_TOKEN=` (pra webhook de status)
   - `DJANGO_SECRET_KEY=`
7. **Configurar WhatsApp Cloud API:** criar app no Meta for Developers → adicionar produto WhatsApp → cadastrar número de teste → gerar token → testar envio com `curl` antes de codar o cliente.
8. **Schema do Postgres:** rodar primeira migration com os models do schema da seção 4.
9. **Sprint 1 (sugestão):** US10 (autenticação) + US04 (registrar relato) + US01 (ver alertas no mapa) + US03 (níveis de severidade no marcador). Ainda sem ML, sem WhatsApp, sem gatilho automático — só CRUD via DRF + mapa React básico pra validar o fluxo ponta a ponta.

---

## 8. Status (atualizar conforme o código for nascendo)

- [ ] Django project + apps criados
- [ ] React (Vite) bootstrap
- [ ] PostgreSQL rodando (local via Docker)
- [ ] `.env.example` commitado com todas as chaves
- [ ] Models e migrations iniciais
- [ ] DRF: endpoints `/api/users/`, `/api/relatos/`
- [ ] Frontend consumindo a API (login + criar relato + listar)
- [ ] Notebook 01_eda concluído
- [ ] Primeiro modelo de regressão treinado e serializado (joblib)
- [ ] Streamlit dashboard com EDA + métricas do modelo
- [ ] Integração OpenWeather funcionando
- [ ] Cliente WhatsApp Cloud API enviando mensagem de teste
- [ ] Mapa funcional no React (Leaflet/Mapbox)
- [ ] Trigger de alerta ponta a ponta: relato → previsão → WhatsApp
