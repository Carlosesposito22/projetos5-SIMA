/**
 * Seção de gatilhos automáticos por bairro — US07.
 *
 * Exibe AlertaBairro com status "ativo" criados pelo backend quando o
 * número de relatos em um bairro cruza o threshold configurado.
 * O operador da Defesa Civil pode marcar cada alerta como resolvido.
 */

import { useState } from 'react'

const CFG_NIVEL = {
  critico: {
    label: 'Crítico',
    card:  'border-red-300 bg-red-50',
    badge: 'bg-red-100 text-red-800 border border-red-300',
    dot:   'bg-red-500',
    icone: '🔴',
  },
  alerta: {
    label: 'Alerta',
    card:  'border-amber-300 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    dot:   'bg-amber-500',
    icone: '🟠',
  },
  atencao: {
    label: 'Atenção',
    card:  'border-emerald-300 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    dot:   'bg-emerald-500',
    icone: '🟡',
  },
}

const fmtRelativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

function tempoRelativo(iso) {
  const diffMin = Math.round((new Date(iso) - Date.now()) / 60_000)
  if (Math.abs(diffMin) < 60) return fmtRelativo.format(diffMin, 'minute')
  const diffHr = Math.round(diffMin / 60)
  if (Math.abs(diffHr) < 24) return fmtRelativo.format(diffHr, 'hour')
  return fmtRelativo.format(Math.round(diffHr / 24), 'day')
}

function CardAlerta({ alerta, onResolver }) {
  const [resolvendo, setResolvendo] = useState(false)
  const cfg = CFG_NIVEL[alerta.nivel] ?? CFG_NIVEL.atencao

  const handleResolver = async () => {
    setResolvendo(true)
    try {
      await onResolver(alerta.id)
    } finally {
      setResolvendo(false)
    }
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 ${cfg.card}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-lg leading-none mt-0.5" aria-hidden="true">
          {cfg.icone}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">
              {alerta.bairro.nome}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {alerta.total_relatos} relato{alerta.total_relatos !== 1 ? 's' : ''} na última
            hora · disparado {tempoRelativo(alerta.criado_em)}
          </p>
        </div>
      </div>

      <button
        onClick={handleResolver}
        disabled={resolvendo}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
      >
        {resolvendo && (
          <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        )}
        Resolver
      </button>
    </div>
  )
}

export function GatilhosAtivos({ alertas, onResolver }) {
  if (!alertas || alertas.length === 0) return null

  const temCritico = alertas.some((a) => a.nivel === 'critico')

  return (
    <section
      aria-label="Gatilhos automáticos ativos"
      className={`rounded-xl border-2 px-5 py-4 flex flex-col gap-3 ${
        temCritico ? 'border-red-400 bg-red-50/40' : 'border-amber-400 bg-amber-50/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-slate-800">
          {temCritico ? '🚨' : '⚠️'} Gatilhos Automáticos Ativos
        </span>
        <span className="text-xs font-semibold bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">
          {alertas.length}
        </span>
        <span className="text-xs text-slate-500 ml-1">
          — threshold de relatos por bairro cruzado
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {alertas.map((a) => (
          <CardAlerta key={a.id} alerta={a} onResolver={onResolver} />
        ))}
      </div>
    </section>
  )
}
