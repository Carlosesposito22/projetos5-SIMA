/**
 * Legenda fixa do mapa — explica os 3 níveis de severidade (US03).
 *
 * As cores acompanham os círculos de área de risco em ``AreaRisco.jsx``
 * e os marcadores em ``MarcadorRelato.jsx``; se mudar a paleta lá, mudar
 * aqui também.
 */

import { NIVEIS } from '../lib/relatos'

// Mesmas cores hex de AreaRisco / MarcadorRelato — Tailwind não chega no
// SVG do Leaflet, então a paleta fica hard-coded aqui.
const CORES_HEX = {
  baixo: '#10b981',
  medio: '#f59e0b',
  alto: '#dc2626',
}

export function LegendaNiveis() {
  return (
    <div
      className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-3 w-60"
      role="region"
      aria-label="Legenda dos níveis de alagamento"
    >
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Severidade do alagamento
      </div>

      <ul className="space-y-1.5">
        {NIVEIS.map((nivel) => (
          <li key={nivel.valor} className="flex items-start gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full mt-0.5 shrink-0 ring-2 ring-white"
              style={{ backgroundColor: CORES_HEX[nivel.valor] }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 leading-tight">
                {nivel.rotulo}
              </div>
              <div className="text-[11px] text-slate-500 leading-snug">
                {nivel.descricao}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
