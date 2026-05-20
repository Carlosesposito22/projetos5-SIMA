/**
 * Busca de endereço por CEP — fallback de localização quando o GPS falha.
 *
 * Encadeia ViaCEP (CEP → endereço) com Nominatim (endereço → lat/lng) e
 * devolve o resultado ao componente pai via callback `onLocalizado`.
 *
 * Reutilizável: além de US04, serve depois pra Defesa Civil (US06) focar
 * o mapa num CEP específico.
 */

import { useState } from 'react'
import {
  buscarCEP,
  formatarCEP,
  geocodificarEndereco,
  limparCEP,
} from '../lib/geocoder'

const MENSAGENS_ERRO = {
  cep_invalido: 'O CEP precisa ter 8 dígitos.',
  cep_nao_encontrado: 'CEP não encontrado nos Correios.',
  sem_resultado:
    'Endereço encontrado mas sem coordenadas precisas. Tente o GPS ou digite manualmente.',
  rede: 'Sem conexão para consultar agora. Tente novamente.',
}

export function BuscaCEP({ onLocalizado }) {
  const [cep, setCep] = useState('')
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState(null)

  const handleCepChange = (e) => {
    setCep(formatarCEP(e.target.value))
    setErro(null)
  }

  const handleBuscar = async (e) => {
    e.preventDefault()
    setErro(null)
    setBuscando(true)
    try {
      const enderecoCEP = await buscarCEP(cep)
      const coords = await geocodificarEndereco({
        ...enderecoCEP,
        numero: numero.trim(),
      })
      onLocalizado({
        lat: coords.lat,
        lng: coords.lng,
        bairro: enderecoCEP.bairro,
        displayName: coords.displayName,
      })
    } catch (err) {
      setErro(MENSAGENS_ERRO[err.code] || 'Não foi possível localizar agora.')
    } finally {
      setBuscando(false)
    }
  }

  const podeBuscar = limparCEP(cep).length === 8 && !buscando

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="cep" className="block text-xs font-medium text-slate-600 mb-1">
            CEP
          </label>
          <input
            id="cep"
            type="text"
            inputMode="numeric"
            value={cep}
            onChange={handleCepChange}
            maxLength={9}
            placeholder="50710-000"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
        <div>
          <label
            htmlFor="numero"
            className="block text-xs font-medium text-slate-600 mb-1"
          >
            Número{' '}
            <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            id="numero"
            type="text"
            inputMode="numeric"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="123"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
        <button
          type="button"
          onClick={handleBuscar}
          disabled={!podeBuscar}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
        >
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {erro && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
    </div>
  )
}
