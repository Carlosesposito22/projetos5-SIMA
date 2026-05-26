/**
 * Legenda flutuante do heatmap — gradiente verde→âmbar→vermelho.
 *
 * As cores e pontos de parada acompanham `OPCOES_HEAT.gradient` em
 * `HeatmapRelatos.jsx`; se um mudar, o outro precisa acompanhar.
 */

export function LegendaNiveis() {
  return (
    <div
      className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-sm p-3 w-56"
      role="region"
      aria-label="Legenda do mapa de calor"
    >
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Intensidade
      </div>

      <div
        className="h-3 rounded-full mb-1.5"
        style={{
          background:
            'linear-gradient(to right, #10b981 0%, #f59e0b 50%, #dc2626 100%)',
        }}
        aria-hidden="true"
      />

      <div className="flex justify-between text-xs text-slate-600">
        <span>Baixa</span>
        <span>Média</span>
        <span>Alta</span>
      </div>

      <p className="text-[11px] text-slate-500 mt-2 leading-snug">
        Áreas mais quentes concentram mais relatos ou relatos de nível alto.
      </p>
    </div>
  )
}
