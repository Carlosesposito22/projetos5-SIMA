/**
 * Mapa interativo de Recife (US01 + US03).
 *
 * Camadas (de baixo pra cima):
 *  1. Tiles CartoDB Voyager (basemap limpo, sem POIs).
 *  2. GeoJSON dos bairros (contorno apenas — sem fill).
 *  3. Áreas de risco coloridas — círculos geográficos por relato, raio
 *     em metros, cor casando com o nível (Atenção/Alerta/Crítico).
 *     Pintam visualmente as ruas/quarteirões ao redor de cada ponto.
 *  4. Marcadores clicáveis sobre as áreas (popup com detalhe do relato).
 */

import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { AreaRisco } from './AreaRisco'
import { MarcadorRelato } from './MarcadorRelato'
import { useBairrosGeoJSON } from '../lib/bairrosGeo'

const CENTRO_RECIFE = [-8.05, -34.9]
const ZOOM_INICIAL = 12

// Bounds aproximados pra impedir o usuário de "fugir" do Recife com pan.
const LIMITES_RECIFE = [
  [-8.18, -35.05], // sudoeste
  [-7.93, -34.83], // nordeste
]

const ESTILO_BAIRRO = {
  color: '#475569', // slate-600
  weight: 1,
  opacity: 0.5,
  fillColor: '#cbd5e1', // slate-300
  fillOpacity: 0.05,
}

export function MapaRecife({ relatos }) {
  const { geojson } = useBairrosGeoJSON()

  return (
    <MapContainer
      center={CENTRO_RECIFE}
      zoom={ZOOM_INICIAL}
      minZoom={11}
      maxZoom={18}
      maxBounds={LIMITES_RECIFE}
      maxBoundsViscosity={0.8}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {geojson && (
        <GeoJSON
          data={geojson}
          style={() => ESTILO_BAIRRO}
          // Sem onEachFeature: contorno é decorativo no MVP.
        />
      )}

      {relatos.map((relato) => (
        <AreaRisco key={`area-${relato.id}`} relato={relato} />
      ))}

      {relatos.map((relato) => (
        <MarcadorRelato key={relato.id} relato={relato} />
      ))}
    </MapContainer>
  )
}
