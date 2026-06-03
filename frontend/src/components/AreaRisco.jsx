/**
 * Camada de áreas de risco no mapa (US01 + US03).
 *
 * Substitui o heatmap por círculos geográficos coloridos (raio em metros)
 * centrados em cada relato. Por que círculos em vez de blobs do heatmap:
 *  - Pintam visualmente as ruas/quarteirões ao redor do relato (a 60–120m
 *    de raio, em zoom de cidade, cobrem mais ou menos 1–3 quarteirões).
 *  - A cor é literal — verde/âmbar/vermelho casa 1:1 com Atenção/Alerta/
 *    Crítico — o usuário não precisa traduzir gradiente pra severidade.
 *  - Quando círculos se sobrepõem, a opacidade compõe naturalmente,
 *    indicando concentração sem precisar de algoritmo extra.
 *  - Escalam com o zoom (são metros, não pixels): aproximar revela
 *    o tamanho real da área afetada.
 *
 * Raio cresce com a severidade — alagamento Crítico tende a afetar
 * uma área maior que uma poça (Atenção).
 */

import { Circle } from 'react-leaflet'

const ESTILO_POR_NIVEL = {
  baixo: { cor: '#10b981', raio: 60 },   // Atenção  — verde, 60m
  medio: { cor: '#f59e0b', raio: 90 },   // Alerta   — âmbar, 90m
  alto:  { cor: '#dc2626', raio: 130 },  // Crítico  — vermelho, 130m
}

const ESTILO_FALLBACK = { cor: '#64748b', raio: 80 }

export function AreaRisco({ relato }) {
  const { cor, raio } = ESTILO_POR_NIVEL[relato.nivel] || ESTILO_FALLBACK

  return (
    <Circle
      center={[Number(relato.lat), Number(relato.lng)]}
      radius={raio}
      pathOptions={{
        color: cor,
        weight: 1,
        opacity: 0.5,
        fillColor: cor,
        fillOpacity: 0.28,
      }}
      // interactive=false: o clique pertence ao MarcadorRelato por cima,
      // pra não competir com a tooltip e duplicar listeners.
      interactive={false}
    />
  )
}
