/**
 * Marcador clicável de um relato — fica por cima do heatmap.
 *
 * Raio pequeno (6px) com borda branca pra destacar contra o gradiente.
 * O heatmap dá o impacto visual; o marcador entrega a interatividade
 * (popup com nível, bairro, autor, horário, descrição).
 */

import { CircleMarker, Popup } from 'react-leaflet'

const CORES = {
  baixo: '#10b981',
  medio: '#f59e0b',
  alto: '#dc2626',
}

const ROTULOS = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

function formatarTempoRelativo(timestamp) {
  const diffMin = Math.floor((Date.now() - new Date(timestamp)) / 60_000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  return `há ${Math.floor(diffH / 24)} d`
}

export function MarcadorRelato({ relato }) {
  const cor = CORES[relato.nivel] || '#64748b'
  const rotulo = ROTULOS[relato.nivel] || relato.nivel
  const bairro = relato.bairro?.nome || 'Bairro não informado'
  const autor = relato.user?.nome || 'Anônimo'

  return (
    <CircleMarker
      center={[Number(relato.lat), Number(relato.lng)]}
      radius={6}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: cor,
        fillOpacity: 1,
      }}
    >
      <Popup>
        <div className="text-sm space-y-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: cor }}
              aria-hidden="true"
            />
            <strong className="text-slate-800">Nível {rotulo}</strong>
          </div>
          <div className="text-slate-600">
            {bairro} · {formatarTempoRelativo(relato.created_at)}
          </div>
          {relato.descricao && (
            <p className="text-slate-700 italic">"{relato.descricao}"</p>
          )}
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Reportado por {autor}
          </div>
        </div>
      </Popup>
    </CircleMarker>
  )
}
