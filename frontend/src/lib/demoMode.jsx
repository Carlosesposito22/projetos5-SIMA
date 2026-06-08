/**
 * ============================================================================
 * MODO DEMO — REMOVER ANTES DE SUBIR EM PRODUÇÃO
 * ============================================================================
 *
 * Gera relatos hipotéticos espalhados por Recife pra demonstrar como o mapa
 * vai se comportar com volume real de usuários. Ativa/desativa pelo atalho
 * `Ctrl + Shift + D` (D de Demo).
 *
 * Como remover este "hack" do projeto:
 *   1. Apagar este arquivo.
 *   2. `grep -r DEMO-MODE frontend/src` — todas as referências estão marcadas.
 *   3. Remover as linhas marcadas em:
 *        - `pages/Mapa.jsx`              (mapa do cidadão)
 *        - `pages/Dashboard.jsx`         (painel — visão geral)
 *        - `pages/DashboardGraficos.jsx` (painel — gráficos)
 *        - `components/dashboard/DashboardLayout.jsx` (banner no header)
 *
 * O estado é compartilhado (módulo singleton) — todas as telas que chamam
 * `useDemoMode()` sincronizam pelo mesmo atalho de teclado.
 * ============================================================================
 */

import { useEffect, useState } from 'react'

const ATALHO = { ctrl: true, shift: true, key: 'D' }

// Estado compartilhado entre todas as instâncias do hook — assim mapa do
// cidadão, painel da Defesa Civil e aba de Gráficos respondem juntos ao
// mesmo atalho e ficam sincronizados mesmo após trocar de rota.
let ativoGlobal = false
const subscribers = new Set()
let listenerInstalado = false

function instalarListener() {
  if (listenerInstalado || typeof window === 'undefined') return
  listenerInstalado = true
  window.addEventListener('keydown', (e) => {
    const tecla = e.key?.toUpperCase()
    if (
      e.ctrlKey === ATALHO.ctrl &&
      e.shiftKey === ATALHO.shift &&
      tecla === ATALHO.key
    ) {
      e.preventDefault()
      ativoGlobal = !ativoGlobal
      subscribers.forEach((cb) => cb(ativoGlobal))
    }
  })
}

// Bairros com coordenadas aproximadas (centróides). Pegamos áreas que
// historicamente alagam em Recife pra a demo parecer plausível.
const RELATOS_FAKE = [
  {
    id: 'demo-1',
    lat: -8.1130,
    lng: -34.9015,
    bairro: { nome: 'Boa Viagem' },
    user: { nome: 'Marcos R.' },
    nivel: 'alto',
    descricao: 'Avenida Conselheiro Aguiar totalmente alagada, carros parados.',
    minutosAtras: 8,
  },
  {
    id: 'demo-2',
    lat: -8.1180,
    lng: -34.9095,
    bairro: { nome: 'Imbiribeira' },
    user: { nome: 'Ana P.' },
    nivel: 'alto',
    descricao: 'Água entrando nas lojas perto do Geraldão.',
    minutosAtras: 22,
  },
  {
    id: 'demo-3',
    lat: -8.0905,
    lng: -34.8870,
    bairro: { nome: 'Pina' },
    user: { nome: 'João S.' },
    nivel: 'medio',
    descricao: 'Rua coberta de água, dá pra passar a pé com cuidado.',
    minutosAtras: 35,
  },
  {
    id: 'demo-4',
    lat: -8.0460,
    lng: -34.9080,
    bairro: { nome: 'Madalena' },
    user: { nome: 'Carla M.' },
    nivel: 'medio',
    descricao: 'Rua da Hora começando a acumular água perto do canal.',
    minutosAtras: 47,
  },
  {
    id: 'demo-5',
    lat: -8.0400,
    lng: -34.9510,
    bairro: { nome: 'Várzea' },
    user: { nome: 'Pedro L.' },
    nivel: 'alto',
    descricao: 'Capibaribe transbordou, várias casas atingidas.',
    minutosAtras: 12,
  },
  {
    id: 'demo-6',
    lat: -8.0250,
    lng: -34.9100,
    bairro: { nome: 'Casa Amarela' },
    user: { nome: 'Larissa B.' },
    nivel: 'medio',
    descricao: 'Subida da Estrada do Encanamento alagada.',
    minutosAtras: 58,
  },
  {
    id: 'demo-7',
    lat: -8.0810,
    lng: -34.9215,
    bairro: { nome: 'Afogados' },
    user: { nome: 'Roberto F.' },
    nivel: 'alto',
    descricao: 'Avenida Recife com mais de meio metro de água.',
    minutosAtras: 4,
  },
  {
    id: 'demo-8',
    lat: -8.0520,
    lng: -34.9305,
    bairro: { nome: 'Cordeiro' },
    user: { nome: 'Júlia T.' },
    nivel: 'baixo',
    descricao: 'Poças grandes na rua, ainda dá pra passar.',
    minutosAtras: 95,
  },
  {
    id: 'demo-9',
    lat: -8.1325,
    lng: -34.9445,
    bairro: { nome: 'Ibura' },
    user: { nome: 'Fábio C.' },
    nivel: 'alto',
    descricao: 'UR-1 com várias ruas tomadas pela água.',
    minutosAtras: 18,
  },
  {
    id: 'demo-10',
    lat: -8.0815,
    lng: -34.9415,
    bairro: { nome: 'Areias' },
    user: { nome: 'Beatriz A.' },
    nivel: 'medio',
    descricao: 'Cruzamento da BR-101 com Caçote começou a alagar.',
    minutosAtras: 30,
  },
  {
    id: 'demo-11',
    lat: -8.1150,
    lng: -34.9250,
    bairro: { nome: 'Ipsep' },
    user: { nome: 'Tiago O.' },
    nivel: 'medio',
    descricao: 'Avenida Mascarenhas de Morais com bolsões grandes.',
    minutosAtras: 64,
  },
  {
    id: 'demo-12',
    lat: -8.0800,
    lng: -34.9320,
    bairro: { nome: 'San Martin' },
    user: { nome: 'Renata V.' },
    nivel: 'baixo',
    descricao: 'Começando a acumular nas laterais da via.',
    minutosAtras: 110,
  },
  {
    id: 'demo-13',
    lat: -8.0460,
    lng: -34.9185,
    bairro: { nome: 'Torre' },
    user: { nome: 'Eduardo M.' },
    nivel: 'medio',
    descricao: 'Rua Real da Torre alagando perto da praça.',
    minutosAtras: 40,
  },
  {
    id: 'demo-14',
    lat: -8.0305,
    lng: -34.9200,
    bairro: { nome: 'Casa Forte' },
    user: { nome: 'Patrícia D.' },
    nivel: 'baixo',
    descricao: 'Esquina do Real Hospital ficou com poças grandes.',
    minutosAtras: 75,
  },
  {
    id: 'demo-15',
    lat: -8.0305,
    lng: -34.9055,
    bairro: { nome: 'Tamarineira' },
    user: { nome: 'Bruno H.' },
    nivel: 'medio',
    descricao: 'Ruas internas próximo ao hospital alagadas.',
    minutosAtras: 50,
  },
  {
    id: 'demo-16',
    lat: -8.1090,
    lng: -34.9060,
    bairro: { nome: 'Boa Viagem' },
    user: { nome: 'Sofia A.' },
    nivel: 'medio',
    descricao: 'Rua Setúbal com água até a metade dos pneus.',
    minutosAtras: 26,
  },
  {
    id: 'demo-17',
    lat: -8.0680,
    lng: -34.8950,
    bairro: { nome: 'Recife' },
    user: { nome: 'Lucas P.' },
    nivel: 'alto',
    descricao: 'Bairro do Recife Antigo com ruas intransitáveis.',
    minutosAtras: 16,
  },
  {
    id: 'demo-18',
    lat: -8.0125,
    lng: -34.9510,
    bairro: { nome: 'Apipucos' },
    user: { nome: 'Helena K.' },
    nivel: 'alto',
    descricao: 'Açude transbordou, ruas próximas tomadas.',
    minutosAtras: 6,
  },

  // ── Dia de chuva forte — 48 relatos adicionais ───────────────────────
  // Distribuídos de ~7 min até ~18h atrás, com pico em 30-180 min.
  // Formato one-liner pra densidade visual; mantém o mesmo schema.

  // 5-30 min — urgentes
  { id: 'demo-19', lat: -8.0805, lng: -34.9225, bairro: { nome: 'Afogados' }, user: { nome: 'Bruno T.' }, nivel: 'alto', descricao: 'Av. Recife totalmente parada, ônibus boiando.', minutosAtras: 7 },
  { id: 'demo-20', lat: -8.1135, lng: -34.9020, bairro: { nome: 'Boa Viagem' }, user: { nome: 'Camila R.' }, nivel: 'alto', descricao: 'Av. Cons. Aguiar com cerca de 60cm de água.', minutosAtras: 11 },
  { id: 'demo-21', lat: -8.1325, lng: -34.9440, bairro: { nome: 'Ibura' }, user: { nome: 'Diego N.' }, nivel: 'alto', descricao: 'UR-2 inteira tomada, vizinhos subindo móveis.', minutosAtras: 14 },
  { id: 'demo-22', lat: -8.0395, lng: -34.9505, bairro: { nome: 'Várzea' }, user: { nome: 'Elaine F.' }, nivel: 'alto', descricao: 'Capibaribe transbordou de novo, casas atingidas.', minutosAtras: 19 },
  { id: 'demo-23', lat: -8.0780, lng: -34.8915, bairro: { nome: 'Coque' }, user: { nome: 'Felipe G.' }, nivel: 'medio', descricao: 'Ruas internas começando a alagar perto do canal.', minutosAtras: 24 },
  { id: 'demo-24', lat: -8.1180, lng: -34.9090, bairro: { nome: 'Imbiribeira' }, user: { nome: 'Gabriela L.' }, nivel: 'medio', descricao: 'Geraldão fechou pro público, ruas em volta inundadas.', minutosAtras: 28 },

  // 30-90 min — auge
  { id: 'demo-25', lat: -8.0810, lng: -34.9220, bairro: { nome: 'Afogados' }, user: { nome: 'Hugo M.' }, nivel: 'alto', descricao: 'Linha do trem com água acima dos trilhos.', minutosAtras: 34 },
  { id: 'demo-26', lat: -8.1145, lng: -34.9040, bairro: { nome: 'Boa Viagem' }, user: { nome: 'Iara P.' }, nivel: 'medio', descricao: 'Av. Eng. Domingos Ferreira intransitável de carro.', minutosAtras: 38 },
  { id: 'demo-27', lat: -8.0820, lng: -34.9215, bairro: { nome: 'Afogados' }, user: { nome: 'Jorge S.' }, nivel: 'alto', descricao: 'Largo da Paz com mais de 1m de água.', minutosAtras: 42 },
  { id: 'demo-28', lat: -8.1180, lng: -34.9100, bairro: { nome: 'Imbiribeira' }, user: { nome: 'Kátia W.' }, nivel: 'alto', descricao: 'Av. Mascarenhas de Morais com carros boiando.', minutosAtras: 46 },
  { id: 'demo-29', lat: -8.1330, lng: -34.9450, bairro: { nome: 'Ibura' }, user: { nome: 'Léo R.' }, nivel: 'alto', descricao: 'UR-3 também atingida, várias famílias desabrigadas.', minutosAtras: 52 },
  { id: 'demo-30', lat: -8.0930, lng: -34.9285, bairro: { nome: 'Mustardinha' }, user: { nome: 'Marta H.' }, nivel: 'medio', descricao: 'Ruas perto da feira inteiras alagadas.', minutosAtras: 58 },
  { id: 'demo-31', lat: -8.1095, lng: -34.9355, bairro: { nome: 'Caçote' }, user: { nome: 'Nilson J.' }, nivel: 'medio', descricao: 'Av. dos Caçotes com bolsões grandes.', minutosAtras: 65 },
  { id: 'demo-32', lat: -8.1185, lng: -34.9355, bairro: { nome: 'Sancho' }, user: { nome: 'Olga V.' }, nivel: 'medio', descricao: 'Ruas internas com água até o meio do pneu.', minutosAtras: 71 },
  { id: 'demo-33', lat: -8.0760, lng: -34.9280, bairro: { nome: 'Bongi' }, user: { nome: 'Paula E.' }, nivel: 'medio', descricao: 'Av. Caxangá com bolsão enorme perto do retorno.', minutosAtras: 78 },
  { id: 'demo-34', lat: -8.0445, lng: -34.9100, bairro: { nome: 'Madalena' }, user: { nome: 'Quésia A.' }, nivel: 'medio', descricao: 'Rua da Hora subindo, comércios fechando.', minutosAtras: 85 },

  // 90-180 min — segunda onda
  { id: 'demo-35', lat: -8.0395, lng: -34.8895, bairro: { nome: 'Encruzilhada' }, user: { nome: 'Rafael I.' }, nivel: 'medio', descricao: 'Av. Beberibe com lentidão e poças grandes.', minutosAtras: 95 },
  { id: 'demo-36', lat: -8.0290, lng: -34.9085, bairro: { nome: 'Casa Amarela' }, user: { nome: 'Simone D.' }, nivel: 'baixo', descricao: 'Bueiros transbordando na Estrada do Encanamento.', minutosAtras: 102 },
  { id: 'demo-37', lat: -8.0455, lng: -34.9175, bairro: { nome: 'Torre' }, user: { nome: 'Túlio K.' }, nivel: 'medio', descricao: 'Av. Caxangá lenta, água cobrindo faixa direita.', minutosAtras: 110 },
  { id: 'demo-38', lat: -8.0815, lng: -34.9410, bairro: { nome: 'Areias' }, user: { nome: 'Úrsula B.' }, nivel: 'medio', descricao: 'Estrada dos Remédios com retornos parados.', minutosAtras: 118 },
  { id: 'demo-39', lat: -8.0530, lng: -34.9305, bairro: { nome: 'Cordeiro' }, user: { nome: 'Vânia F.' }, nivel: 'medio', descricao: 'Rua do Cordeiro com vários carros parados.', minutosAtras: 125 },
  { id: 'demo-40', lat: -8.0680, lng: -34.8945, bairro: { nome: 'Recife' }, user: { nome: 'Wagner T.' }, nivel: 'alto', descricao: 'Bairro do Recife alagado, ruas centrais bloqueadas.', minutosAtras: 132 },
  { id: 'demo-41', lat: -8.0775, lng: -34.8730, bairro: { nome: 'Brasília Teimosa' }, user: { nome: 'Xênia P.' }, nivel: 'alto', descricao: 'Maré alta + chuva, ruas inteiras submersas.', minutosAtras: 138 },
  { id: 'demo-42', lat: -8.0735, lng: -34.9015, bairro: { nome: 'Joana Bezerra' }, user: { nome: 'Yago R.' }, nivel: 'medio', descricao: 'Av. Sul com bolsões e ônibus parados.', minutosAtras: 145 },
  { id: 'demo-43', lat: -8.0700, lng: -34.9185, bairro: { nome: 'Mangueira' }, user: { nome: 'Zélia C.' }, nivel: 'medio', descricao: 'Ruas da comunidade com cerca de 30cm de água.', minutosAtras: 152 },
  { id: 'demo-44', lat: -8.0510, lng: -34.9460, bairro: { nome: 'Engenho do Meio' }, user: { nome: 'Adriano M.' }, nivel: 'baixo', descricao: 'Trânsito mais lento, poças nas avenidas.', minutosAtras: 160 },
  { id: 'demo-45', lat: -8.0605, lng: -34.9450, bairro: { nome: 'Iputinga' }, user: { nome: 'Bia S.' }, nivel: 'medio', descricao: 'Av. Caxangá próximo ao Geraldão lenta.', minutosAtras: 168 },
  { id: 'demo-46', lat: -8.1305, lng: -34.9445, bairro: { nome: 'Cohab' }, user: { nome: 'Caio H.' }, nivel: 'alto', descricao: 'Av. Dois Rios com casas inundadas.', minutosAtras: 175 },

  // 3-5h — recapitulando a tarde
  { id: 'demo-47', lat: -8.1185, lng: -34.9450, bairro: { nome: 'Jiquiá' }, user: { nome: 'Débora L.' }, nivel: 'medio', descricao: 'Várias ruas com bolsões há horas.', minutosAtras: 195 },
  { id: 'demo-48', lat: -8.0315, lng: -34.9050, bairro: { nome: 'Tamarineira' }, user: { nome: 'Eron G.' }, nivel: 'baixo', descricao: 'Avenida 17 de Agosto com poças, mas trafegável.', minutosAtras: 210 },
  { id: 'demo-49', lat: -8.0040, lng: -34.9450, bairro: { nome: 'Brejo da Guabiraba' }, user: { nome: 'Fátima K.' }, nivel: 'medio', descricao: 'Ladeiras com água descendo forte.', minutosAtras: 225 },
  { id: 'demo-50', lat: -8.0010, lng: -34.9175, bairro: { nome: 'Alto José Bonifácio' }, user: { nome: 'Gabriel U.' }, nivel: 'medio', descricao: 'Subida da Macaxeira com risco de deslizamento.', minutosAtras: 240 },
  { id: 'demo-51', lat: -8.0295, lng: -34.9395, bairro: { nome: 'Macaxeira' }, user: { nome: 'Helena Z.' }, nivel: 'alto', descricao: 'Bairro inteiro com ruas alagadas, pessoas evacuando.', minutosAtras: 255 },
  { id: 'demo-52', lat: -8.0395, lng: -34.8985, bairro: { nome: 'Rosarinho' }, user: { nome: 'Inácio P.' }, nivel: 'baixo', descricao: 'Av. Norte com poças, fluxo normal.', minutosAtras: 270 },
  { id: 'demo-53', lat: -8.0305, lng: -34.8920, bairro: { nome: 'Hipódromo' }, user: { nome: 'Júlia D.' }, nivel: 'medio', descricao: 'Av. Beberibe com lentidão.', minutosAtras: 282 },
  { id: 'demo-54', lat: -8.1320, lng: -34.9100, bairro: { nome: 'Setúbal' }, user: { nome: 'Kleber V.' }, nivel: 'medio', descricao: 'Rua Setúbal com bolsão grande na altura do shopping.', minutosAtras: 295 },

  // 5-10h — manhã
  { id: 'demo-55', lat: -8.0395, lng: -34.9075, bairro: { nome: 'Madalena' }, user: { nome: 'Lara T.' }, nivel: 'baixo', descricao: 'Já tinha começado a alagar de manhã cedo.', minutosAtras: 320 },
  { id: 'demo-56', lat: -8.1190, lng: -34.9260, bairro: { nome: 'Ipsep' }, user: { nome: 'Marcelo X.' }, nivel: 'medio', descricao: 'Av. Mascarenhas com poças desde cedo.', minutosAtras: 355 },
  { id: 'demo-57', lat: -8.0095, lng: -34.9500, bairro: { nome: 'Apipucos' }, user: { nome: 'Nathalia E.' }, nivel: 'medio', descricao: 'Açude começou a transbordar na manhã.', minutosAtras: 390 },
  { id: 'demo-58', lat: -8.0810, lng: -34.9325, bairro: { nome: 'San Martin' }, user: { nome: 'Otto J.' }, nivel: 'baixo', descricao: 'Ruas internas com água acumulando.', minutosAtras: 425 },
  { id: 'demo-59', lat: -8.0710, lng: -34.9495, bairro: { nome: 'Curado' }, user: { nome: 'Patrícia W.' }, nivel: 'medio', descricao: 'Conjunto Curado com várias ruas tomadas.', minutosAtras: 470 },
  { id: 'demo-60', lat: -8.0735, lng: -34.9490, bairro: { nome: 'Jardim São Paulo' }, user: { nome: 'Rodrigo I.' }, nivel: 'medio', descricao: 'BR-101 com lentidão por causa da água.', minutosAtras: 510 },
  { id: 'demo-61', lat: -8.0285, lng: -34.9385, bairro: { nome: 'Macaxeira' }, user: { nome: 'Sara B.' }, nivel: 'baixo', descricao: 'Começo de chuva forte por aqui.', minutosAtras: 545 },
  { id: 'demo-62', lat: -8.1330, lng: -34.9255, bairro: { nome: 'Boa Viagem' }, user: { nome: 'Thiago L.' }, nivel: 'baixo', descricao: 'Rua dos Navegantes com poças, sem alagamento sério.', minutosAtras: 585 },

  // 10-18h — madrugada / dia anterior
  { id: 'demo-63', lat: -8.0810, lng: -34.9215, bairro: { nome: 'Afogados' }, user: { nome: 'Ulisses N.' }, nivel: 'baixo', descricao: 'Choveu forte na madrugada, ruas começando a acumular.', minutosAtras: 680 },
  { id: 'demo-64', lat: -8.1090, lng: -34.9065, bairro: { nome: 'Boa Viagem' }, user: { nome: 'Vanessa O.' }, nivel: 'baixo', descricao: 'Setúbal com poças desde a madrugada.', minutosAtras: 760 },
  { id: 'demo-65', lat: -8.0445, lng: -34.9075, bairro: { nome: 'Madalena' }, user: { nome: 'Wesley F.' }, nivel: 'baixo', descricao: 'Rua da Hora com bolsões pequenos durante a noite.', minutosAtras: 850 },
  { id: 'demo-66', lat: -8.0250, lng: -34.9105, bairro: { nome: 'Casa Amarela' }, user: { nome: 'Yasmin G.' }, nivel: 'baixo', descricao: 'Bueiros entupidos formando poça desde a madrugada.', minutosAtras: 1080 },
]

function gerarRelatos() {
  const agora = Date.now()
  return RELATOS_FAKE.map(({ minutosAtras, ...resto }) => ({
    ...resto,
    created_at: new Date(agora - minutosAtras * 60_000).toISOString(),
  }))
}

export function useDemoMode() {
  const [ativo, setAtivo] = useState(ativoGlobal)

  useEffect(() => {
    instalarListener()
    subscribers.add(setAtivo)
    // Sincroniza com o estado atual caso o toggle tenha rolado entre o
    // primeiro render e o efeito (paranoia barata).
    setAtivo(ativoGlobal)
    return () => {
      subscribers.delete(setAtivo)
    }
  }, [])

  const relatosFalsos = ativo ? gerarRelatos() : []
  return { ativo, relatosFalsos }
}

// Banner agora se autogerencia — basta colocar <BannerDemo /> em qualquer
// container posicionado (header sticky, main relativo) que ele aparece
// quando o modo demo está ativo.
export function BannerDemo() {
  const { ativo } = useDemoMode()
  if (!ativo) return null
  return (
    <div
      className="absolute top-4 left-4 z-[1100] bg-fuchsia-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse"
      role="status"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
      MODO DEMO — Ctrl+Shift+D pra desativar
    </div>
  )
}
