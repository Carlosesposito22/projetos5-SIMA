/**
 * Página de registro de relato de alagamento (US04).
 *
 * Fluxo: usuário autenticado abre a página, captura a localização (GPS do
 * navegador ou digita manualmente), escolhe o nível e envia. Em sucesso,
 * volta pra Home depois de uma confirmação curta.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NivelSelector } from '../components/NivelSelector'
import { relatos } from '../lib/relatos'

const MAX_DESCRICAO = 500

export function Reportar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [bairro, setBairro] = useState(user?.bairro || '')
  const [nivel, setNivel] = useState('')
  const [descricao, setDescricao] = useState('')

  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [submetendo, setSubmetendo] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false)
  const [avisoLocalizacao, setAvisoLocalizacao] = useState(null)

  const handleUsarLocalizacao = () => {
    setAvisoLocalizacao(null)
    if (!('geolocation' in navigator)) {
      setAvisoLocalizacao(
        'Seu navegador não suporta geolocalização. Preencha latitude e longitude manualmente.'
      )
      return
    }
    setObtendoLocalizacao(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setObtendoLocalizacao(false)
      },
      (err) => {
        setObtendoLocalizacao(false)
        if (err.code === err.PERMISSION_DENIED) {
          setAvisoLocalizacao(
            'Permissão de localização negada. Você pode digitar latitude e longitude manualmente.'
          )
        } else {
          setAvisoLocalizacao(
            'Não foi possível obter sua localização agora. Tente de novo ou preencha manualmente.'
          )
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const formValido = lat !== '' && lng !== '' && nivel !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErros({})
    setErroGeral(null)
    setSubmetendo(true)
    try {
      await relatos.criar({
        lat,
        lng,
        bairro: bairro.trim(),
        nivel,
        descricao: descricao.trim(),
      })
      setSucesso(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      if (err.response?.status === 400 && err.response.data) {
        setErros(err.response.data)
      } else {
        setErroGeral('Não foi possível enviar agora. Tente novamente.')
      }
    } finally {
      setSubmetendo(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <span className="text-emerald-700 text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Relato enviado!
          </h2>
          <p className="text-slate-600 text-sm">
            Obrigado por ajudar a comunidade. Redirecionando...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight">
            SIMA
          </Link>
          <Link
            to="/"
            className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Cancelar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">
            Reportar alagamento
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Seu relato aparece no mapa para outros moradores e alimenta os alertas da Defesa Civil.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <fieldset>
              <legend className="block text-sm font-medium text-slate-700 mb-2">
                Localização <span className="text-red-600">*</span>
              </legend>
              <button
                type="button"
                onClick={handleUsarLocalizacao}
                disabled={obtendoLocalizacao}
                className="mb-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                {obtendoLocalizacao
                  ? 'Obtendo localização...'
                  : '📍 Usar minha localização'}
              </button>

              {avisoLocalizacao && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  {avisoLocalizacao}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="lat"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Latitude
                  </label>
                  <input
                    id="lat"
                    type="text"
                    inputMode="decimal"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    required
                    placeholder="-8.063169"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {erros.lat && (
                    <p className="text-xs text-red-600 mt-1">{erros.lat}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="lng"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Longitude
                  </label>
                  <input
                    id="lng"
                    type="text"
                    inputMode="decimal"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    required
                    placeholder="-34.871139"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {erros.lng && (
                    <p className="text-xs text-red-600 mt-1">{erros.lng}</p>
                  )}
                </div>
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="bairro"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Bairro <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id="bairro"
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Boa Viagem"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {erros.bairro && (
                <p className="text-xs text-red-600 mt-1">{erros.bairro}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nível do alagamento <span className="text-red-600">*</span>
              </label>
              <NivelSelector value={nivel} onChange={setNivel} />
              {erros.nivel && (
                <p className="text-xs text-red-600 mt-1">{erros.nivel}</p>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label
                  htmlFor="descricao"
                  className="block text-sm font-medium text-slate-700"
                >
                  Descrição <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <span className="text-xs text-slate-400">
                  {descricao.length}/{MAX_DESCRICAO}
                </span>
              </div>
              <textarea
                id="descricao"
                rows={3}
                maxLength={MAX_DESCRICAO}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Água cobrindo a rua inteira, carros parando."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {erros.descricao && (
                <p className="text-xs text-red-600 mt-1">{erros.descricao}</p>
              )}
            </div>

            {erroGeral && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erroGeral}
              </div>
            )}

            <button
              type="submit"
              disabled={!formValido || submetendo}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submetendo ? 'Enviando...' : 'Enviar relato'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
