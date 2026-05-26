/**
 * Camada de mapa de calor (heatmap) dos relatos de alagamento.
 *
 * Integra `leaflet.heat` ao react-leaflet via `useMap` — a lib estende
 * `L.heatLayer` imperativamente, então precisamos adicionar/remover a layer
 * num useEffect manualmente em vez de usar um componente declarativo.
 *
 * Peso por nível:
 *   baixo → 0.3   (verde)
 *   medio → 0.6   (âmbar)
 *   alto  → 1.0   (vermelho)
 *
 * Relatos próximos somam intensidade naturalmente — o gradient já lida com
 * a sobreposição, então áreas com vários relatos viram pontos quentes
 * sem precisar agregar manualmente.
 */

import L from 'leaflet'
import 'leaflet.heat'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

const PESOS = {
  baixo: 0.3,
  medio: 0.6,
  alto: 1.0,
}

const OPCOES_HEAT = {
  radius: 40,
  blur: 30,
  maxZoom: 17,
  minOpacity: 0.4,
  // Verde → âmbar → vermelho. As chaves são frações do valor máximo.
  gradient: {
    0.2: '#10b981',
    0.5: '#f59e0b',
    0.8: '#dc2626',
  },
}

export function HeatmapRelatos({ relatos }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const pontos = relatos.map((r) => [
      Number(r.lat),
      Number(r.lng),
      PESOS[r.nivel] ?? 0.5,
    ])

    const layer = L.heatLayer(pontos, OPCOES_HEAT).addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [relatos, map])

  return null
}
