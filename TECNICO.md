# SIMA — Contexto Técnico (Código & Estrutura)

> Para o contexto do produto (problema, persona, pesquisa, decisões de escopo), ver [`PROJETO.md`](PROJETO.md).
>
> **Estado atual:** projeto rodando ponta-a-ponta via `docker compose up`. **Todas as 10 histórias do usuário do MVP estão implementadas.** Pendente apenas a trilha de análise de dados (notebooks, Streamlit, integração meteo).

---

## 1. Stack Atual

| Camada | Tecnologia | Versão / nota |
| --- | --- | --- |
| **Frontend** | React 19 + Vite 8 | SPA, `src/` organizado em `pages/ components/ contexts/ lib/`. |
| **Estilização** | **Tailwind CSS v4** | Via plugin oficial `@tailwindcss/vite`. Sem `tailwind.config.js` — `@import "tailwindcss";` em [`src/index.css`](frontend/src/index.css). |
| **Roteamento** | React Router v7 | `BrowserRouter`, rotas aninhadas pro painel (`/dashboard`, `/dashboard/graficos`). |
| **HTTP** | Axios | Instância em [`src/lib/api.js`](frontend/src/lib/api.js) com interceptor que injeta `Bearer` e renova access via refresh quando dá 401. |
| **Mapa** | Leaflet + react-leaflet | Tiles CartoDB Voyager, contorno de bairros via GeoJSON, áreas de risco pintadas (círculos geográficos coloridos por nível de severidade — Atenção/Alerta/Crítico). |
| **Gráficos** | Recharts 2.x | `BarChart`, `PieChart`, `ResponsiveContainer` na aba "Gráficos" do painel. |
| **Backend** | **Python 3.12 + Django 6 + DRF** | Apps modulares em `backend/apps/`. |
| **Auth** | `djangorestframework-simplejwt[crypto]` | Email como `USERNAME_FIELD`. Access 60min + refresh 7d com rotação + blacklist. |
| **Imagens** | Pillow + `MEDIA_URL` / `MEDIA_ROOT` | `Relato.imagem` (ImageField). Servido pelo Django em DEBUG. |
| **Banco** | PostgreSQL 16 | Decisão consciente de NÃO usar NoSQL no MVP — volume controlado, relacional cobre. |
| **Análise de dados** | pandas + matplotlib + scikit-learn | Configurados em [`ml/requirements-ml.txt`](ml/requirements-ml.txt). Notebooks ainda não escritos. |
| **Dashboard analítico** | Streamlit | Pasta [`ml/streamlit_app/`](ml/streamlit_app/) existe mas vazia. Trilha de dados ainda não começou. |
| **Comunicação tempo real** | Polling HTTP (30s) | **NÃO** usar WebSockets no MVP — questionário mostrou conectividade instável durante chuvas. |
| **Canal de alerta** | WhatsApp (Twilio ou Meta) | `apps/alertas/whatsapp.py` suporta ambos os provedores. Signal `post_save` do Relato dispara envio em thread separada. Webhook de recebimento implementado. |
| **APIs meteorológicas** | OpenWeather + Tomorrow.io + (APAC) | Chaves reservadas no `.env.example`; integração ainda não codada. |
| **Orquestração local** | **Docker Compose** | 3 serviços (postgres + backend + frontend) com healthcheck e hot-reload nos dois lados. |
| **Deploy** | *A definir* | Decisão adiada — alinhar mais pra frente conforme o produto for tomando forma. |

**Sobre Streamlit vs React:** os dois vão conviver. **React** é o produto pra cidadão e Defesa Civil (mapa, reportar, painel). **Streamlit** é o dashboard analítico exigido pela trilha de Análise e Visualização de Dados — fica mais próximo dos notebooks. Não há motivo pra reimplementar a análise no React.

---

## 2. Arquitetura (Estado Atual)

```text
                  Browser (localhost:5173 / :8000)
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
     ┌──────────────────┐             ┌──────────────────┐
     │ Frontend React   │  REST/JSON  │ Django + DRF     │
     │ Vite dev server  │ ──────────▶ │ runserver        │
     │ Tailwind + Leaf. │  Bearer JWT │ JWT (simplejwt)  │
     │ Router + Recharts│             │ /api/...         │
     └──────────────────┘             └────────┬─────────┘
                                               │ ORM
                                               ▼
                                      ┌──────────────────┐
                                      │  PostgreSQL 16   │
                                      │  (volume Docker) │
                                      └──────────────────┘

  Tudo orquestrado via docker-compose.yml (postgres → backend → frontend).
  Migrações rodam automaticamente no boot do backend.
```

**Fluxo atual ponta-a-ponta:**

1. **Cidadão** abre `/`, autentica (`POST /api/users/login/`), cai no mapa de Recife (Leaflet) com relatos das últimas 6h carregados via `GET /api/relatos/?ultimas_horas=6`. Polling de 30s. Sensores ativos aparecem com marcadores diferenciados.
2. **Cidadão** clica em "Reportar", envia `POST /api/relatos/` com `lat`, `lng`, `bairro_id`, `nivel`, `descricao`, `endereco` e (opcional) `imagem` multipart.
3. **Signal `post_save`** do Relato (em thread separada) chama `services.relato_criado()` → geofencing Haversine → envia email + WhatsApp pra usuários no raio. Em seguida, `services.verificar_threshold_bairro()` → cria `AlertaBairro` se threshold cruzado.
4. **Defesa Civil** autentica e vai pra `/dashboard` com: 4 KPIs, banner de gatilhos automáticos ativos (US07), mapa + barra de filtros bairro/nível (US08), "Bairros críticos", tabela. Polling de 30s.
5. **Defesa Civil** pode marcar gatilhos como resolvidos (`POST /api/alertas/bairros/<id>/resolver/`) e filtrar por bairro/nível no mapa e tabela.
6. **Admin** acessa `/dashboard/sensores` para CRUD de sensores IoT e `/dashboard/usuarios` para gestão de usuários.

---

## 3. Estrutura Atual de Pastas

```text
projetos5-SIMA/
├── docker-compose.yml              # postgres + backend + frontend
├── .env.example                    # vars de ambiente (copiar pra .env)
│
├── frontend/                       # React 19 + Vite 8 + Tailwind v4
│   ├── Dockerfile                  # node:22-alpine, vite dev na 5173
│   ├── package.json
│   ├── vite.config.js              # plugins: react + tailwindcss
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # BrowserRouter + AuthProvider + rotas
│       ├── index.css               # @import "tailwindcss";
│       ├── pages/
│       │   ├── Login.jsx           # tabs Cidadão / Defesa Civil
│       │   ├── Register.jsx        # cadastro público (cria role=cidadao)
│       │   ├── Mapa.jsx            # US01 — mapa do cidadão
│       │   ├── Reportar.jsx        # US04 — form de relato (com foto)
│       │   ├── Alertas.jsx         # US02/US04 — meus relatos (editar/deletar)
│       │   ├── Perfil.jsx          # edição de perfil do usuário
│       │   ├── Dashboard.jsx       # US06/US07/US08 — visão geral + filtros + gatilhos
│       │   ├── DashboardGraficos.jsx  # US06 — aba gráficos
│       │   ├── SensoresAdmin.jsx   # US09 — CRUD de sensores (role=admin)
│       │   └── UsuariosAdmin.jsx   # gestão de usuários (role=admin)
│       ├── components/
│       │   ├── ProtectedRoute.jsx  # ProtectedRoute + PublicOnly + RoleProtectedRoute
│       │   ├── MenuPerfil.jsx      # dropdown de perfil + sair
│       │   ├── MapaRecife.jsx      # Leaflet + áreas pintadas + marcadores relatos + sensores
│       │   ├── AreaRisco.jsx       # círculo geográfico colorido por nível
│       │   ├── MarcadorRelato.jsx
│       │   ├── MarcadorSensor.jsx  # US09 — ícone diferenciado por tipo de sensor
│       │   ├── LegendaNiveis.jsx
│       │   ├── NivelSelector.jsx
│       │   ├── BairroSelect.jsx
│       │   ├── BuscaCEP.jsx
│       │   ├── TelefoneInput.jsx   # input com máscara E.164 pra WhatsApp
│       │   ├── BotaoDenuncia.jsx   # denunciar relato como falso
│       │   ├── BotaoConfirmacao.jsx # confirmar que relato é verdadeiro
│       │   └── dashboard/
│       │       ├── DashboardLayout.jsx  # header + tabs + Outlet
│       │       ├── KpiCard.jsx
│       │       ├── BairrosCriticos.jsx
│       │       ├── GatilhosAtivos.jsx   # US07 — banner de AlertaBairro ativos
│       │       └── TabelaRelatos.jsx    # com coluna Foto + lightbox
│       ├── contexts/
│       │   └── AuthContext.jsx     # user + login/register/logout
│       └── lib/
│           ├── api.js              # axios instance + interceptors JWT
│           ├── relatos.js          # service de relatos (+ ?meus=true, ?nivel=, ?bairro=)
│           ├── dashboard.js        # service do painel (resumo + gatilhos)
│           ├── sensores.js         # service de sensores (US09)
│           ├── usuarios.js         # service de usuários (admin)
│           ├── seriesHorarias.js   # agregações pros gráficos
│           ├── bairros.js
│           ├── bairrosGeo.js       # GeoJSON dos bairros
│           ├── geocoder.js
│           └── demoMode.jsx        # *temporário* — modo demo
│
├── backend/                        # Django 6 + DRF
│   ├── Dockerfile                  # python:3.12-slim, migrate + runserver
│   ├── manage.py
│   ├── requirements.txt
│   ├── sima/                       # projeto Django
│   │   ├── settings.py             # AUTH_USER_MODEL, SIMPLE_JWT, DRF, CORS, SIMA_ALERTAS
│   │   ├── urls.py                 # /api/users/ /api/relatos/ /api/alertas/ /api/sensores/ etc.
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/                  # ✅ US10 — login JWT, role, permissions, CRUD usuários
│   │   ├── relatos/                # ✅ US04 — CRUD com imagem, Denuncia, Confirmacao
│   │   ├── areas_risco/            # ✅ Bairro + seed migration
│   │   ├── dashboard/              # ✅ US06 — endpoint agregado
│   │   ├── alertas/                # ✅ US02/US05/US07 — Alerta + AlertaBairro + signal + WA
│   │   │   ├── models.py           # Alerta (por usuário) + AlertaBairro (threshold bairro)
│   │   │   ├── services.py         # relato_criado() + verificar_threshold_bairro()
│   │   │   ├── signals.py          # post_save(Relato) → despacha em thread separada
│   │   │   ├── whatsapp.py         # adaptador Twilio + Meta + webhook view
│   │   │   └── views.py            # AlertaBairroListView + AlertaBairroResolverView
│   │   ├── sensores/               # ✅ US09 — Sensor IoT CRUD
│   │   └── clima/                  # ⏳ reservado pra integração meteorológica
│   └── tests/
│
└── ml/                             # ⏳ trilha de Análise/Visualização de Dados
    ├── requirements-ml.txt         # pandas, sklearn, matplotlib, jupyter, streamlit
    ├── notebooks/                  # vazio — EDA / regressão / classificador
    ├── data/                       # vazio (gitignored)
    ├── models/                     # vazio (gitignored)
    └── streamlit_app/              # vazio
```

**Convenção `apps.*`:** todos os apps Django ficam dentro de `backend/apps/` e são referenciados como `apps.users`, `apps.relatos`, etc. nos `INSTALLED_APPS`.

---

## 4. Modelo de Dados (Estado Atual)

```sql
-- ✅ users (apps.users.User — AbstractBaseUser + PermissionsMixin)
users (
  id PK,
  nome,
  email UNIQUE,            -- USERNAME_FIELD
  password,                -- hash do Django
  telefone,                -- E.164 normalizado (pra WhatsApp — US02/US05)
  bairro_id FK → bairros,  -- bairro principal de monitoramento
  lat, lng,                -- coordenadas opcionais (geofencing US02)
  role,                    -- 'cidadao' | 'defesa_civil' | 'admin'
  is_active, is_staff, is_superuser,
  date_joined
)

-- ✅ bairros (apps.areas_risco.Bairro — populado via data migration)
bairros (
  id PK,
  nome UNIQUE,
  slug UNIQUE,
  rpa                      -- Região Político-Administrativa (1–6), opcional
)

-- ✅ relatos (apps.relatos.Relato — US04)
relatos (
  id PK,
  user_id FK → users (PROTECT),
  lat, lng,                -- DecimalField(9,6)
  bairro_id FK → bairros (SET_NULL),
  nivel,                   -- 'baixo' | 'medio' | 'alto'
  endereco VARCHAR(512),   -- endereço reverso (geocoder)
  descricao TEXT(500),
  imagem,                  -- ImageField, upload_to='relatos/'
  created_at
)
-- índices: bairro_id, -created_at

-- ✅ denuncias / confirmacoes (apps.relatos — crowdsourcing de veracidade)
denuncias    (id PK, relato_id FK, user_id FK, created_at) -- unique(relato, user)
confirmacoes (id PK, relato_id FK, user_id FK, created_at) -- unique(relato, user)

-- ✅ alertas (apps.alertas.Alerta — US02/US05 — 1 registro por relato×usuário×canal)
alertas (
  id PK,
  relato_id FK → relatos (CASCADE),
  usuario_id FK → users (CASCADE),
  canal,    -- 'email' | 'whatsapp' | 'push'
  status,   -- 'pendente' | 'enviado' | 'falhou'
  detalhe,  -- erro ou ID externo do envio
  created_at
)
-- unique_together: (relato, usuario, canal)

-- ✅ alertas_bairro (apps.alertas.AlertaBairro — US07 — gatilho por threshold)
alertas_bairro (
  id PK,
  bairro_id FK → bairros (CASCADE),
  nivel,         -- 'atencao' | 'alerta' | 'critico'
  status,        -- 'ativo' | 'resolvido'
  total_relatos, -- relatos na janela que dispararam
  criado_em,
  resolvido_em,
  resolvido_por FK → users (SET_NULL)
)

-- ✅ sensores (apps.sensores.Sensor — US09)
sensores (
  id PK,
  nome VARCHAR(120),
  tipo,           -- 'pluviometro' | 'regua_nivel' | 'camera' | 'iot_generico'
  descricao TEXT(500),
  lat, lng,       -- DecimalField(9,6)
  bairro_id FK → bairros (SET_NULL),
  ativo BOOL,
  ultimo_dado_em, -- última leitura recebida
  created_at
)

-- ⏳ areas_risco (polígonos + threshold por área — fora do MVP)
-- ⏳ clima_historico (cache de APIs meteorológicas — pendente)
```

`User.bairro` é FK pra `Bairro` (não string livre), o que permite geofencing por bairro quando `lat/lng` do usuário não está preenchido.

---

## 5. Endpoints da API (Estado Atual)

Todas as rotas vivem sob `/api/`:

| Método | Rota | Auth | O que faz |
| --- | --- | --- | --- |
| POST | `/api/users/register/` | público | Cadastro (sempre cria `role=cidadao`). Devolve `access` + `refresh` + `user`. |
| POST | `/api/users/login/` | público | Login JWT por email+senha. Devolve `access` + `refresh` + `user`. |
| POST | `/api/users/refresh/` | refresh | Renova access (rotação + blacklist do refresh anterior). |
| POST | `/api/users/logout/` | bearer | Blacklist do refresh token. |
| GET / PATCH | `/api/users/me/` | bearer | Perfil do usuário. `role` é read-only — promoção via Django admin. |
| GET | `/api/users/` | bearer + admin | Lista todos os usuários (gestão). |
| GET / PATCH / DELETE | `/api/users/<id>/` | bearer + admin | Detalhe / editar / remover usuário. |
| GET / POST | `/api/relatos/` | bearer | Lista e cria relatos. Aceita `?ultimas_horas=N`, `?bairro=<id ou slug>`, `?nivel=`, `?meus=true`. |
| GET / PATCH / DELETE | `/api/relatos/<id>/` | bearer + dono | Detalhe / editar / apagar relato. |
| POST | `/api/relatos/<id>/denunciar/` | bearer | Denuncia relato como falso (idempotente). |
| DELETE | `/api/relatos/<id>/denunciar/` | bearer | Retira denúncia. |
| POST | `/api/relatos/<id>/confirmar/` | bearer | Confirma relato como verdadeiro (idempotente). |
| DELETE | `/api/relatos/<id>/confirmar/` | bearer | Retira confirmação. |
| GET | `/api/bairros/` | livre | Lista de bairros (pro `BairroSelect`). |
| GET | `/api/dashboard/resumo/` | bearer + DC/admin | KPIs (hoje/7d/30d), `por_nivel`, top `por_bairro`, `ultimo_relato_em`. |
| GET | `/api/alertas/bairros/` | bearer + DC/admin | Gatilhos automáticos ativos por bairro (US07). |
| POST | `/api/alertas/bairros/<id>/resolver/` | bearer + DC/admin | Marca AlertaBairro como resolvido (US07). |
| GET / POST | `/api/alertas/whatsapp/webhook/` | público | Verificação Meta (GET) e recebimento de mensagens WA (POST). |
| GET / POST | `/api/sensores/` | bearer (leitura); admin (escrita) | Lista e cadastra sensores IoT (US09). Aceita `?ativo=true/false`. |
| GET / PATCH / DELETE | `/api/sensores/<id>/` | bearer (leitura); admin (escrita) | Detalhe / editar / remover sensor. |
| (admin) | `/admin/` | Django admin | Promover usuários, ver dados crus. |

**Permissions custom:** `apps.users.permissions.IsDefesaCivilOrAdmin` (libera operador, admin role e superuser). `SoAdminEscrita` em sensores (leitura para qualquer autenticado, escrita somente admin).

---

## 6. Convenções de Código

- **Idioma:** comentários, nomes de variáveis e mensagens de UI em **português**. Identificadores de framework (Django, React) seguem o padrão da lib.
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- **Branches:** `main` protegida; trabalho em `feat/<nome>` ou `fix/<nome>`. PRs aceitos via merge commit (ver histórico).
- **Variáveis sensíveis:** em `.env` na raiz (carregado por `django-environ` no backend e por `VITE_*` no frontend). Nunca commitar.
- **Testes Django:** rodar com `docker compose exec backend python manage.py test`. Hoje ~50 testes (users, relatos, dashboard, areas_risco).
- **Markdown:** lint pede `*` pra emphasis (não `_`).
- **Linters/formatters:** *ainda não configurados*. Black/ruff (Python) e ESLint/Prettier (frontend) ficam pra introduzir quando a base crescer.

---

## 7. Plano da Trilha de Análise de Dados (Pendente)

A trilha do 5º CC exige entregáveis específicos que devem viver em `ml/`. **Nada disso foi começado ainda** — pasta criada com `requirements-ml.txt` mas notebooks/streamlit vazios.

1. **Plano de análise** — perguntas investigativas documentadas (markdown).
2. **EDA notebook** — distribuição de relatos por bairro, correlação chuva×nível, séries temporais.
3. **Modelo de regressão** — treino, métricas (MAE, RMSE, R²), serialização (`joblib`).
4. **Modelo classificador** — risco binário (alagará / não alagará nas próximas N horas), métricas de classificação (matriz de confusão, curva ROC).
5. **Streamlit dashboard** — filtros, gráficos, modelo treinado direto.
6. **Documentação das decisões analíticas** — ADRs simples ou seção no README.

---

## 8. Status (atualizado conforme USs entram)

### 8.1. ✅ Entregue — todas as 10 USs do MVP

- [x] Docker Compose com postgres + backend (Django auto-migrate) + frontend (Vite dev), hot-reload nos dois lados
- [x] `.env.example` na raiz com vars de DB / Vite / OpenWeather / Tomorrow / WhatsApp / Twilio / Django
- [x] **US10** — User customizado (email), JWT (access + refresh + rotação + blacklist), endpoints register/login/refresh/logout/me, admin customizado, tabs Cidadão/Defesa Civil no front, `RoleProtectedRoute`, seed automático de contas `defesa@sima.local/defesa123` e `admin@sima.local/admin123` via data migration. Edição de perfil em `/perfil`. Gestão de usuários em `/dashboard/usuarios` (admin).
- [x] **Bairros** — model + seed migration com bairros oficiais de Recife (`apps.areas_risco`)
- [x] **US04** — model `Relato` com FK pra Bairro, `nivel`, `endereco`, `descricao`, `imagem` (ImageField + Pillow); ViewSet DRF com CRUD; form React + Leaflet pra escolher ponto; suporte a edição/exclusão. Models `Denuncia` e `Confirmacao` para crowdsourcing de veracidade.
- [x] **US01** — mapa do cidadão com Leaflet + contornos GeoJSON de bairros + áreas de risco pintadas (círculos geográficos coloridos) + marcadores clicáveis + `MarcadorSensor` para sensores IoT ativos; polling 30s
- [x] **US03** — vocabulário Atenção/Alerta/Crítico em toda UI; áreas pintadas em verde/âmbar/vermelho com raio crescente (60/90/130m); legenda fixa
- [x] **US06** — endpoint `/api/dashboard/resumo/`, painel React com 4 KPIs, mapa com filtros, "Bairros críticos", tabela Foto + lightbox, aba "Gráficos" com Recharts (barras empilhadas, pizza, top bairros), polling 30s
- [x] **US08** — `?bairro=<id|slug>&nivel=<n>` no `RelatoViewSet`; dropdowns de filtro no painel (bairro + nível) com reload automático
- [x] **US07** — model `AlertaBairro`, `services.verificar_threshold_bairro()` (configurable via `SIMA_ALERTAS`), signal `post_save(Relato)` dispara em thread, endpoint `GET /api/alertas/bairros/` e `POST .../resolver/`, componente `GatilhosAtivos` no painel
- [x] **US02** — `services.relato_criado()`: geofencing Haversine, seleção de usuários no raio ou mesmo bairro, disparo de email (Django `send_mail`) + WhatsApp; model `Alerta` persiste histórico com status (enviado/falhou)
- [x] **US05** — `apps/alertas/whatsapp.py`: suporta Twilio (Content Template + session message) e Meta Cloud API; webhook GET/POST para verificação e recebimento de mensagens WA
- [x] **US09** — model `Sensor` com tipo/lat/lng/bairro/ativo; CRUD via DRF (`/api/sensores/`); página `SensoresAdmin` em `/dashboard/sensores` (role=admin); `MarcadorSensor` no mapa

### 8.2. ⏳ Trilha de dados (pendente)

- [ ] Notebook `01_eda.ipynb` rodando contra o Postgres
- [ ] Modelo de regressão treinado + serializado (joblib)
- [ ] Modelo classificador (risco binário) + métricas (matriz de confusão, curva ROC)
- [ ] Streamlit dashboard apontando pro mesmo banco
- [ ] Integração OpenWeather coletando precipitação (app `clima` reservado)

### 8.3. Outras pendências técnicas

- [ ] Ordenação alfabética da seed de bairros desalinhada com o teste `test_ordenacao_alfabetica` em `apps.areas_risco.tests` (1 falha pré-existente)
- [ ] Setup de linters (black/ruff + ESLint/Prettier)
- [ ] Definir alvo de deploy (cloud provider, CI/CD)
- [ ] Limpar marcadores `DEMO-MODE` (ver [`lib/demoMode.jsx`](frontend/src/lib/demoMode.jsx)) antes de qualquer demo "séria"
- [ ] Implementar opt-out de WhatsApp: webhook já recebe "PARAR" mas a flag no `User` ainda não é persistida

---

## 9. Como Rodar Localmente

Pré-requisito: Docker Desktop ligado.

```powershell
# 1ª vez: copiar o exemplo de env
Copy-Item .env.example .env

# Subir tudo (build na 1ª vez, depois reusa imagens)
docker compose up -d

# Uma conta de Defesa Civil é criada automaticamente pelo seed:
#   email: defesa@sima.local
#   senha: defesa123
# As credenciais aparecem na própria tela de login (aba Defesa Civil).
# Pra acessar o /admin/, ainda dá pra criar um superuser:
docker compose exec backend python manage.py createsuperuser

# Logs em tempo real
docker compose logs -f backend
docker compose logs -f frontend

# Rodar testes
docker compose exec backend python manage.py test

# Depois de mexer em package.json (frontend), volume anônimo precisa reset:
docker compose up -d --build --renew-anon-volumes frontend

# Depois de mexer em requirements.txt (backend):
docker compose up -d --build backend
```

URLs:

- Frontend: <http://localhost:5173>
- API: <http://localhost:8000/api/>
- Admin: <http://localhost:8000/admin/>
- Postgres: `localhost:5432` (user/pass/db `sima` por padrão)
