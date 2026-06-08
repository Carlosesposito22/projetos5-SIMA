/**
 * Página de registro de relato de alagamento (US04).
 *
 * Localização vem do GPS do navegador ou do CEP — o usuário nunca digita
 * coordenadas. Em ambos os caminhos a tela mostra o endereço resolvido
 * por reverse geocoding (Nominatim) pra confirmar o que vai ser salvo.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NivelSelector } from '../components/NivelSelector'
import { BuscaCEP } from '../components/BuscaCEP'
import { relatos } from '../lib/relatos'
import { reverseGeocode } from '../lib/geocoder'
import { normalizarParaSlug, useBairros } from '../lib/bairros'

const MAX_DESCRICAO = 500

export function Reportar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { bairros } = useBairros()

  // Localização canônica do relato — preenchida pelo GPS ou pelo CEP.
  // Lat/lng nunca aparecem em input pro usuário; só vão pro backend.
  const [localizacao, setLocalizacao] = useState(null) // { lat, lng, endereco, fonte }

  const [bairroId, setBairroId] = useState(null)
  const [nivel, setNivel] = useState('')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState(null)
  const [previewImagem, setPreviewImagem] = useState(null)

  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [submetendo, setSubmetendo] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [obtendoGPS, setObtendoGPS] = useState(false)
  const [avisoGPS, setAvisoGPS] = useState(null)
  const [modoLocalizacao, setModoLocalizacao] = useState('gps')

  const aplicarLocalizacao = ({ lat, lng, endereco, bairroSugerido, fonte }) => {
    setLocalizacao({ lat, lng, endereco, fonte })
    setBairroId(null)
    if (bairroSugerido) {
      const slugAlvo = normalizarParaSlug(bairroSugerido)
      const match = bairros.find((b) => b.slug === slugAlvo)
      if (match) setBairroId(match.id)
    }
  }

  const handleLocalizadoPorCEP = ({ lat, lng, bairro: bairroCEP, displayName }) => {
    aplicarLocalizacao({
      lat,
      lng,
      endereco: displayName,
      bairroSugerido: bairroCEP,
      fonte: 'cep',
    })
  }

  const handleUsarGPS = () => {
    setAvisoGPS(null)
    if (!('geolocation' in navigator)) {
      setAvisoGPS('Seu navegador não suporta geolocalização.')
      return
    }
    setObtendoGPS(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        try {
          const { displayName, bairro: bairroReverso } = await reverseGeocode(lat, lng)
          aplicarLocalizacao({
            lat,
            lng,
            endereco: displayName,
            bairroSugerido: bairroReverso,
            fonte: 'gps',
          })
        } catch {
          // Reverse falhou — ainda assim temos lat/lng válidos.
          aplicarLocalizacao({
            lat,
            lng,
            endereco: 'Localização capturada pelo GPS',
            fonte: 'gps',
          })
        } finally {
          setObtendoGPS(false)
        }
      },
      (err) => {
        setObtendoGPS(false)
        if (err.code === err.PERMISSION_DENIED) {
          setAvisoGPS('Permissão de localização negada.')
        } else {
          setAvisoGPS('Não foi possível obter sua localização agora.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const formValido = localizacao !== null && nivel !== ''

  const handleImagemChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImagem(null)
      setPreviewImagem(null)
      return
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setErros((prev) => ({ ...prev, imagem: 'Por favor, selecione uma imagem válida.' }))
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErros((prev) => ({ ...prev, imagem: 'A imagem não pode ser maior que 5MB.' }))
      return
    }

    setImagem(file)
    setErros((prev) => {
      const novoErros = { ...prev }
      delete novoErros.imagem
      return novoErros
    })

    // Criar preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewImagem(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoverImagem = () => {
    setImagem(null)
    setPreviewImagem(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErros({})
    setErroGeral(null)
    setSubmetendo(true)
    try {
      const formData = new FormData()
      formData.append('lat', localizacao.lat.toFixed(6))
      formData.append('lng', localizacao.lng.toFixed(6))
      formData.append('endereco', localizacao.endereco || '')
      if (bairroId) formData.append('bairro', bairroId)
      formData.append('nivel', nivel)
      formData.append('descricao', descricao.trim())
      if (imagem) formData.append('imagem', imagem)

      await relatos.criar(formData)
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

              <div
                className="inline-flex p-1 bg-slate-100 rounded-lg mb-3"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoLocalizacao === 'gps'}
                  onClick={() => setModoLocalizacao('gps')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    modoLocalizacao === 'gps'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📍 GPS
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoLocalizacao === 'cep'}
                  onClick={() => setModoLocalizacao('cep')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    modoLocalizacao === 'cep'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏠 CEP
                </button>
              </div>

              {modoLocalizacao === 'gps' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleUsarGPS}
                    disabled={obtendoGPS}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    {obtendoGPS
                      ? 'Obtendo localização...'
                      : '📍 Usar minha localização'}
                  </button>

                  {avisoGPS && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {avisoGPS}{' '}
                      <button
                        type="button"
                        onClick={() => setModoLocalizacao('cep')}
                        className="underline font-medium"
                      >
                        Buscar por CEP
                      </button>
                    </p>
                  )}
                </div>
              )}

              {modoLocalizacao === 'cep' && (
                <BuscaCEP onLocalizado={handleLocalizadoPorCEP} />
              )}

              {localizacao && (
                <div className="mt-3 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <span className="text-emerald-700 font-semibold">✓</span>
                  <div className="flex-1">
                    <div className="text-emerald-900 font-medium">
                      Localização encontrada
                    </div>
                    <div className="text-emerald-800">{localizacao.endereco}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalizacao(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 underline shrink-0"
                  >
                    Trocar
                  </button>
                </div>
              )}

              {(erros.lat || erros.lng) && (
                <p className="text-xs text-red-600 mt-2">
                  {erros.lat || erros.lng}
                </p>
              )}
            </fieldset>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Imagem <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              {!previewImagem ? (
                <label className="block w-full min-h-[180px] border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagemChange}
                    className="hidden"
                  />
                  <div className="text-slate-600 text-sm">
                    <div className="text-lg mb-1">📸</div>
                    <div className="font-medium mb-0.5">Clique ou arraste uma imagem</div>
                    <div className="text-xs text-slate-500">PNG, JPG ou GIF (máximo 5MB)</div>
                  </div>
                </label>
              ) : (
                <div className="space-y-3">
                  <img
                    src={previewImagem}
                    alt="Preview"
                    className="w-full h-auto max-h-48 object-cover rounded-lg border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoverImagem}
                    className="w-full px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    Remover imagem
                  </button>
                </div>
              )}
              {erros.imagem && (
                <p className="text-xs text-red-600 mt-2">{erros.imagem}</p>
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
