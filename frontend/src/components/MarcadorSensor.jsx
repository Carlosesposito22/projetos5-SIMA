/**
 * Marcador de sensor IoT no mapa (US09).
 *
 * DivIcon quadrado pequeno (20×20px) com emoji do tipo de sensor.
 * Menor que os relatos (CircleMarker 6px) pra não competir com eles.
 * Sensor inativo aparece em cinza.
 */

import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'

import { iconeSensor } from '../lib/sensores'

function criarIcone(tipo, ativo) {
  const bg    = ativo ? '#4f46e5' : '#94a3b8' // indigo-600 / slate-400
  const emoji = iconeSensor(tipo)
  return L.divIcon({
    html: `<div style="
      width:20px;height:20px;
      background:${bg};
      border:1.5px solid #fff;
      border-radius:4px;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;line-height:1;
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize:    [20, 20],
    iconAnchor:  [10, 10],
    popupAnchor: [0, -13],
    className:   '',
  })
}

export function MarcadorSensor({ sensor }) {
  return (
    <Marker
      position={[Number(sensor.lat), Number(sensor.lng)]}
      icon={criarIcone(sensor.tipo, sensor.ativo)}
    >
      <Popup>
        <div className="text-sm space-y-1 min-w-[160px]">
          <div className="flex items-center gap-2">
            <span className="text-base">{iconeSensor(sensor.tipo)}</span>
            <strong className="text-slate-800">{sensor.nome}</strong>
          </div>
          <div className="text-slate-500 text-xs">{sensor.tipo_display}</div>
          {sensor.bairro_nome && (
            <div className="text-slate-600 text-xs">{sensor.bairro_nome}</div>
          )}
          <div
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              sensor.ativo
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${sensor.ativo ? 'bg-indigo-500' : 'bg-slate-400'}`}
            />
            {sensor.ativo ? 'Ativo' : 'Inativo'}
          </div>
          {sensor.descricao && (
            <p className="text-slate-600 italic text-xs pt-1 border-t border-slate-100">
              {sensor.descricao}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
