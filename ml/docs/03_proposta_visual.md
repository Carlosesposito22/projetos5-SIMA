# CC7 – Proposta de Integração Visual para Publicação Web

**SIMA – Sistema Inteligente de Monitoramento e Alerta de Alagamentos**
Cesar School · 5º Período CC · Trilha de Análise e Visualização de Dados

---

## 1. Visão Geral da Solução

O SIMA é composto por **duas interfaces web complementares**, cada uma com propósito e público-alvo distintos:

| Interface | Tecnologia | Usuário | Propósito |
| --- | --- | --- | --- |
| **Frontend operacional** | React 19 + Vite + Tailwind CSS v4 | Cidadão, Defesa Civil, Admin | Reportar alagamentos, visualizar mapa em tempo real, monitorar dashboard operacional |
| **Dashboard analítico** | Streamlit (Python) | Analista de dados, equipe de pesquisa, professores/avaliadores | Explorar EDA, regressão, classificadores e insights históricos |

As duas interfaces leem o **mesmo banco PostgreSQL** e coexistem na mesma orquestração Docker Compose, mas são publicadas em portas diferentes:
- Frontend React: `http://localhost:5173` (produção: porta 80)
- Dashboard Streamlit: `http://localhost:8501`

---

## 2. Estrutura do Frontend React (Interface Operacional)

### 2.1. Hierarquia de Páginas

```
/                   → redireciona para /login
/login              → Login (tabs: Cidadão / Defesa Civil)
/register           → Cadastro público (role = cidadao)
/mapa               → Mapa interativo (US01/US03) — protegido (cidadão)
/reportar           → Formulário de relato (US04) — protegido (cidadão)
/alertas            → Meus relatos + histórico (US02) — protegido (cidadão)
/perfil             → Edição de perfil do usuário
/dashboard          → Painel Defesa Civil — protegido (defesa_civil/admin)
  /dashboard/graficos   → Aba Gráficos Recharts
  /dashboard/sensores   → CRUD de sensores (admin)
  /dashboard/usuarios   → Gestão de usuários (admin)
```

### 2.2. Componentes Visuais Principais

| Componente | Função Visual |
| --- | --- |
| `MapaRecife.jsx` | Mapa Leaflet com tiles CartoDB Voyager; contornos GeoJSON de bairros; áreas de risco como círculos concêntricos coloridos (60/90/130m de raio por nível) |
| `AreaRisco.jsx` | Círculo geográfico com cor semântica (verde/âmbar/vermelho) e tooltip de nível |
| `GatilhosAtivos.jsx` | Banner de alerta ao topo do painel com destaque visual para AlertaBairros ativos |
| `KpiCard.jsx` | Cards de métricas com ícone, valor em destaque e variação percentual |
| `TabelaRelatos.jsx` | Tabela com coluna de foto (lightbox ao clicar), badge de nível colorido |
| `DashboardGraficos.jsx` | Recharts: BarChart empilhado, PieChart, gráfico de top bairros |

---

## 3. Estrutura do Dashboard Analítico Streamlit

### 3.1. Diagrama de Páginas

```
app.py (entrada)
│
├── pages/01_visao_geral.py     → KPIs, distribuição por nível, top bairros
├── pages/02_temporal.py        → Séries temporais, padrão horário/mensal, sazonalidade
├── pages/03_correlacao.py      → Scatter chuva × relatos, correlação, regressão
├── pages/04_modelos.py         → Matriz de confusão, ROC, métricas do classificador
└── pages/05_sobre.py           → Documentação: decisões visuais, insights, limitações
│
utils/
├── db.py                       → Conexão PostgreSQL via DATABASE_URL
└── modelos.py                  → Carrega regressao.pkl e classificador.pkl
```

### 3.2. Sidebar e Filtros Globais

A sidebar do Streamlit concentra os filtros compartilhados entre páginas:

| Filtro | Tipo | Páginas afetadas |
| --- | --- | --- |
| Período | Seletor (24h / 7d / 30d / Todo período) | 01, 02, 03 |
| Bairro | Multiselect (lista dos bairros reais) | 01, 02 |
| Nível de risco | Multiselect (Baixo / Médio / Alto) | 01, 02 |

---

## 4. Paleta de Cores

A paleta é consistente entre o frontend React e o dashboard Streamlit. As mesmas cores semânticas aparecem em todos os gráficos que codificam nível de risco.

| Nível | Hex | Uso |
| --- | --- | --- |
| **Baixo / Atenção** | `#10b981` (verde esmeralda) | Barras, marcadores, áreas de baixo risco |
| **Médio / Alerta** | `#f59e0b` (âmbar) | Barras, marcadores, áreas de risco moderado |
| **Alto / Crítico** | `#ef4444` (vermelho) | Barras, marcadores, áreas de risco elevado; banners de alerta |
| **Fundo neutro** | `#f8fafc` (cinza claro) | Background de cards e seções |
| **Texto primário** | `#1e293b` (slate-800) | Títulos e texto corrido |
| **Texto secundário** | `#64748b` (slate-500) | Legendas, captions, metadados |

---

## 5. Hierarquia Visual (por página Streamlit)

Cada página segue a mesma estrutura hierárquica, da informação mais sintética para a mais detalhada:

```
1. Título da página        (st.title — maior impacto visual)
2. Contexto / caption      (st.caption — orienta o leitor sobre o que está vendo)
3. KPIs destacados         (st.metric — números em destaque, visíveis de longe)
4. Gráfico principal       (matplotlib/seaborn — visualização central da pergunta)
5. Gráficos de detalhe     (colunas adicionais — análises secundárias)
6. Texto interpretativo    (st.info / st.markdown — insight explícito em linguagem natural)
7. Dados brutos (opcional) (st.dataframe — acesso ao dado subjacente para auditoria)
```

---

## 6. Justificativa da Escolha das Ferramentas

### 6.1. Por que Streamlit (e não mais React)?

| Critério | Streamlit | React (alternativa) |
| --- | --- | --- |
| **Integração com notebooks** | Nativa — código Python direto | Exige API REST ou serialização extra |
| **Curva de aprendizado** | Mínima — equipe já usa Python | Alta — exige JS/TS + estado + bundler |
| **Gráficos de análise** | matplotlib/seaborn/plotly nativos | Recharts/D3 (boa solução, mas diferente do ecossistema analítico) |
| **Velocidade de prototipagem** | Alta — 1 arquivo por página | Baixa — componentes, rotas, context |
| **Deploy** | `streamlit run` ou Streamlit Cloud | Build + servidor estático ou Node |
| **Audiência** | Analistas, pesquisadores, avaliadores | Cidadãos, operadores |

**Conclusão:** Streamlit é a escolha certa para o dashboard analítico porque o público-alvo (analistas, pesquisadores, professores) tolera a interface menos polida em troca de acesso direto aos modelos e dados. Reconstruir toda a análise no React seria custo sem benefício para esse perfil de usuário.

### 6.2. Por que React (e não Streamlit) para o frontend operacional?

- O cidadão e o operador da Defesa Civil precisam de UX polida, responsiva e mobile-first
- O mapa Leaflet interativo, o polling de 30s e o fluxo de autenticação JWT são bem suportados em React
- Streamlit não foi projetado para autenticação de múltiplos papéis (cidadão/defesa_civil/admin)

### 6.3. Por que matplotlib/seaborn (e não Plotly)?

- Os notebooks CC3–CC5 já usam matplotlib/seaborn — manter a mesma biblioteca elimina inconsistências visuais entre notebook e dashboard
- Plotly seria a escolha superior em interatividade (hover, zoom), mas exigiria reescrever todos os gráficos dos notebooks
- Para a entrega acadêmica, matplotlib com `tight_layout` e cores semânticas já atende o requisito de visualizações interpretáveis

---

## 7. Princípios de Design Visual Aplicados

| Princípio | Implementação no SIMA |
| --- | --- |
| **Codificação semântica de cor** | Verde/âmbar/vermelho mapeiam diretamente para baixo/médio/alto em 100% dos gráficos — sem inversão ou uso arbitrário de cores |
| **Hierarquia tipográfica** | Títulos em `fontweight='bold'` tamanho 12–13; anotações de valor em bold menor; texto corrido em plain sans-serif |
| **Redução de ruído visual** | Tema `whitegrid` (seaborn): grades discretas, sem bordas excessivas em barras, sem efeitos 3D |
| **Narrativa explícita** | Cada gráfico tem célula/bloco markdown com interpretação do insight em linguagem não-técnica |
| **Contraste de destaque** | Barra ou elemento com valor mais relevante recebe cor diferenciada (ex.: maior coeficiente em vermelho na regressão múltipla) |
| **Consistência entre plataformas** | Paleta idêntica no React (Tailwind CSS classes) e Streamlit (hex direto nos plots matplotlib) |

---

## 8. Fluxo de Publicação

```
Desenvolvedor faz push → GitHub Actions (CI)
    │
    ├── Backend Django → container Docker → deploy em VPS / Railway
    ├── Frontend React → build Vite → CDN / Vercel / Nginx
    └── Dashboard Streamlit → container Docker → Streamlit Community Cloud ou VPS porta 8501
```

Para a entrega acadêmica (ambiente local):

```bash
docker compose up -d
# Frontend:  http://localhost:5173
# API:       http://localhost:8000/api/
# Streamlit: http://localhost:8501
```

---

## 9. Decisão de Escopo: o que NÃO foi implementado e por quê

| Recurso | Decisão | Justificativa |
| --- | --- | --- |
| **WebSockets no Streamlit** | Não implementado | A pesquisa com usuários mostrou conectividade instável durante chuvas; polling HTTP é mais resiliente |
| **Plotly / Dash interativo** | Não implementado | Curva de aprendizado adicional sem ganho proporcional para a entrega acadêmica |
| **Mapa geográfico no Streamlit** | Não implementado (já existe no React) | Duplicação desnecessária; o `st.map` do Streamlit é limitado comparado ao Leaflet do React |
| **Autenticação no Streamlit** | Não implementado | Dashboard analítico é interno (pesquisa/avaliação), sem exposição pública; autenticação fica no React |
| **Mobile-first no Streamlit** | Parcial | Streamlit gera layout responsivo básico, suficiente para visualização em tablet/desktop; cidadão usa o React |
