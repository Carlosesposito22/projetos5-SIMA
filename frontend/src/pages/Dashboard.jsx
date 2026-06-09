/**
 * Aba "Visão geral" do painel da Defesa Civil (US06 + US08).
 *
 * Conteúdo:
 *  - 4 KPIs (hoje, 7d, 30d, nível alto nas últimas 24h) — sempre globais.
 *  - Barra de filtros: bairro + nível (US08).
 *  - Mapa de Recife (reaproveita MapaRecife do US01) + sidebar Bairros críticos.
 *  - Tabela de relatos recentes.
 *
 * Dois fetches em paralelo a cada 30s: /api/dashboard/resumo/ pra os
 * agregados e /api/relatos/?ultimas_horas=24 pra mapa e tabela.
 * Os filtros de bairro e nível são passados apenas para o fetch de relatos.
 *
 * O header e a navegação por abas ficam no DashboardLayout.
 */

import { useEffect, useRef, useState } from 'react'

import { LegendaNiveis } from '../components/LegendaNiveis'
import { MapaRecife } from '../components/MapaRecife'
import { BairrosCriticos } from '../components/dashboard/BairrosCriticos'
import { KpiCard } from '../components/dashboard/KpiCard'
import { TabelaRelatos } from '../components/dashboard/TabelaRelatos'
import { dashboard as dashboardService } from '../lib/dashboard'
import { relatos as relatosService } from '../lib/relatos'
import { useBairros } from '../lib/bairros'
import { gerarResumoLocal } from '../lib/seriesHorarias'
// DEMO-MODE — remover antes de subir em produção (ver lib/demoMode.jsx)
import { useDemoMode } from '../lib/demoMode'

const JANELA_HORAS = 24
const INTERVALO_POLLING_MS = 30_000

const OPCOES_NIVEL = [
  { value: '', label: 'Todos os níveis' },
  { value: 'alto', label: 'Crítico' },
  { value: 'medio', label: 'Alerta' },
  { value: 'baixo', label: 'Atenção' },
]

const fmtRelativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

function tempoRelativo(iso) {
  if (!iso) return null
  const diffMin = Math.round((new Date(iso) - Date.now()) / 60000)
  if (Math.abs(diffMin) < 60) return fmtRelativo.format(diffMin, 'minute')
  const diffHr = Math.round(diffMin / 60)
  if (Math.abs(diffHr) < 24) return fmtRelativo.format(diffHr, 'hour')
  return fmtRelativo.format(Math.round(diffHr / 24), 'day')
}

export function Dashboard() {
  const [resumo, setResumo] = useState(null)
  const [relatos, setRelatos] = useState([])
  const [carregandoInicial, setCarregandoInicial] = useState(true)
  const [erroPolling, setErroPolling] = useState(false)
  const canceladoRef = useRef(false)

  const [filtroBairro, setFiltroBairro] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')

  const { bairros } = useBairros()

  useEffect(() => {
    canceladoRef.current = false
    setCarregandoInicial(true)

    const params = { ultimas_horas: JANELA_HORAS }
    if (filtroBairro) params.bairro = filtroBairro
    if (filtroNivel) params.nivel = filtroNivel

    const buscar = async () => {
      try {
        const [novoResumo, lista] = await Promise.all([
          dashboardService.resumo(),
          relatosService.listarTodos(params),
        ])
        if (canceladoRef.current) return
        setResumo(novoResumo)
        setRelatos(lista)
        setErroPolling(false)
      } catch {
        if (canceladoRef.current) return
        setErroPolling(true)
      } finally {
        if (!canceladoRef.current) setCarregandoInicial(false)
      }
    }

    buscar()
    const id = setInterval(buscar, INTERVALO_POLLING_MS)

    return () => {
      canceladoRef.current = true
      clearInterval(id)
    }
  }, [filtroBairro, filtroNivel])

  // DEMO-MODE — quando ativo, mistura relatos fictícios e recalcula o resumo
  // localmente pra manter mapa/tabela/KPIs/bairros críticos consistentes
  // (o backend não conhece os relatos fake).
  const { ativo: demoAtivo, relatosFalsos } = useDemoMode()
  const relatosFakeFiltrados = (() => {
    if (!demoAtivo) return []
    let fake = relatosFalsos
    if (filtroNivel) fake = fake.filter((r) => r.nivel === filtroNivel)
    if (filtroBairro) {
      const bairroSel = bairros.find((b) => b.slug === filtroBairro)
      fake = bairroSel ? fake.filter((r) => r.bairro?.nome === bairroSel.nome) : []
    }
    return fake
  })()
  const relatosExibidos = demoAtivo ? [...relatos, ...relatosFakeFiltrados] : relatos
  const resumoExibido = demoAtivo ? gerarResumoLocal(relatosExibidos) : resumo
  // FIM DEMO-MODE

  const ultimoRel = tempoRelativo(resumoExibido?.ultimo_relato_em)
  const filtrosAtivos = filtroBairro || filtroNivel

  function limparFiltros() {
    setFiltroBairro('')
    setFiltroNivel('')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {erroPolling && !carregandoInicial && (
        <div
          className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-sm"
          role="alert"
        >
          Não foi possível atualizar agora. Tentando de novo em instantes...
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          rotulo="Hoje"
          valor={resumoExibido?.totais.hoje ?? '—'}
          sublabel="desde 00:00"
          cor="blue"
        />
        <KpiCard
          rotulo="Últimos 7 dias"
          valor={resumoExibido?.totais.semana ?? '—'}
        />
        <KpiCard
          rotulo="Últimos 30 dias"
          valor={resumoExibido?.totais.mes ?? '—'}
        />
        <KpiCard
          rotulo="Nível alto (24h)"
          valor={resumoExibido?.por_nivel.alto ?? '—'}
          sublabel={ultimoRel ? `último relato ${ultimoRel}` : ''}
          cor="red"
        />
      </section>

      {/* Barra de filtros — US08 */}
      <section
        className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3"
        aria-label="Filtros"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">
          Filtrar
        </span>

        {/* Filtro de bairro */}
        <select
          value={filtroBairro}
          onChange={(e) => setFiltroBairro(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
          aria-label="Filtrar por bairro"
        >
          <option value="">Todos os bairros</option>
          {bairros.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.nome}
            </option>
          ))}
        </select>

        {/* Filtro de nível */}
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filtrar por nível">
          {OPCOES_NIVEL.map((op) => (
            <button
              key={op.value}
              onClick={() => setFiltroNivel(op.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                filtroNivel === op.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {filtrosAtivos && (
          <button
            onClick={limparFiltros}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition"
          >
            Limpar filtros
          </button>
        )}

        {!carregandoInicial && (
          <span className="text-xs text-slate-400 tabular-nums ml-auto">
            {relatosExibidos.length}{' '}
            {relatosExibidos.length === 1 ? 'relato' : 'relatos'}
            {filtrosAtivos ? ' (filtrado)' : ' nas últimas 24h'}
          </span>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[450px] sm:h-[520px] relative">
          <MapaRecife relatos={relatosExibidos} />
          <LegendaNiveis />
        </div>
        <BairrosCriticos bairros={resumoExibido?.por_bairro ?? []} />
      </section>

      <section>
        <TabelaRelatos relatos={relatosExibidos} />
      </section>

      {carregandoInicial && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-2 text-sm text-slate-700 flex items-center gap-2 z-[1200]"
          role="status"
          aria-live="polite"
        >
          <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Carregando dados...
        </div>
      )}
    </div>
  )
}
