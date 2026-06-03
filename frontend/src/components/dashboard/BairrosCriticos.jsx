/**
 * Top de bairros com mais relatos nas últimas 24h (US06).
 * Cada item mostra o ranking, nome, badge do nível máximo e total.
 */

import { ROTULOS_NIVEL } from '../../lib/relatos'

const CORES_NIVEL = {
  baixo: 'bg-emerald-100 text-emerald-800',
  medio: 'bg-amber-100 text-amber-800',
  alto: 'bg-red-100 text-red-800',
}

export function BairrosCriticos({ bairros }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Bairros críticos (24h)
      </h3>

      {bairros.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">
          Nenhum relato nas últimas 24h.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {bairros.map((b, i) => (
            <li
              key={b.bairro.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-slate-400 font-medium tabular-nums w-5 shrink-0">
                  {i + 1}.
                </span>
                <span className="text-slate-800 truncate">{b.bairro.nome}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.nivel_maximo && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${CORES_NIVEL[b.nivel_maximo]}`}
                  >
                    {ROTULOS_NIVEL[b.nivel_maximo]}
                  </span>
                )}
                <span className="text-slate-700 font-semibold tabular-nums w-6 text-right">
                  {b.total}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
