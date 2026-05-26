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
 *   3. Remover as ~4 linhas marcadas em `pages/Mapa.jsx`.
 *
 * Nada além de `pages/Mapa.jsx` deveria importar este módulo.
 * ============================================================================
 */

import { useEffect, useState } from 'react'

const ATALHO = { ctrl: true, shift: true, key: 'D' }

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
]

function gerarRelatos() {
  const agora = Date.now()
  return RELATOS_FAKE.map(({ minutosAtras, ...resto }) => ({
    ...resto,
    created_at: new Date(agora - minutosAtras * 60_000).toISOString(),
  }))
}

export function useDemoMode() {
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      const tecla = e.key?.toUpperCase()
      if (
        e.ctrlKey === ATALHO.ctrl &&
        e.shiftKey === ATALHO.shift &&
        tecla === ATALHO.key
      ) {
        e.preventDefault()
        setAtivo((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const relatosFalsos = ativo ? gerarRelatos() : []
  return { ativo, relatosFalsos }
}

export function BannerDemo({ ativo }) {
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
