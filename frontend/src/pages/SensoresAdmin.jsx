/**
 * Gestão de sensores IoT — US09.
 * Acessível apenas para usuários com role=admin via /dashboard/sensores.
 *
 * Localização do sensor é definida por GPS do navegador ou busca por CEP,
 * nunca por inputs manuais de lat/lng (mesmo padrão de Reportar.jsx).
 */

import { useEffect, useState } from 'react'

import { BuscaCEP } from '../components/BuscaCEP'
import { useBairros } from '../lib/bairros'
import { reverseGeocode } from '../lib/geocoder'
import { TIPOS_SENSOR, iconeSensor, sensores as sensoresService } from '../lib/sensores'

const FORM_VAZIO = {
  nome:      '',
  tipo:      'iot_generico',
  descricao: '',
  bairro:    '',
  ativo:     true,
}

export function SensoresAdmin() {
  const [lista, setLista]             = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [erro, setErro]               = useState(null)
  const [form, setForm]               = useState(FORM_VAZIO)
  const [localizacao, setLocalizacao] = useState(null) // { lat, lng, endereco, fonte }
  const [editandoId, setEditandoId]   = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando]       = useState(false)
  const [erroForm, setErroForm]       = useState(null)
  const [excluindoId, setExcluindoId] = useState(null)

  const [modoLoc, setModoLoc]       = useState('gps')
  const [obtendoGPS, setObtendoGPS] = useState(false)
  const [avisoGPS, setAvisoGPS]     = useState(null)

  const { bairros } = useBairros()

  const carregar = async () => {
    try {
      const dados = await sensoresService.listar()
      setLista(dados)
      setErro(null)
    } catch {
      setErro('Não foi possível carregar os sensores.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // ── GPS ──────────────────────────────────────────────────────────────────

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
          const { displayName } = await reverseGeocode(lat, lng)
          setLocalizacao({ lat, lng, endereco: displayName, fonte: 'gps' })
        } catch {
          setLocalizacao({ lat, lng, endereco: 'Localização capturada pelo GPS', fonte: 'gps' })
        } finally {
          setObtendoGPS(false)
        }
      },
      (err) => {
        setObtendoGPS(false)
        setAvisoGPS(
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada.'
            : 'Não foi possível obter sua localização agora.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const handleLocalizadoPorCEP = ({ lat, lng, displayName }) => {
    setLocalizacao({ lat, lng, endereco: displayName, fonte: 'cep' })
  }

  // ── Abrir / fechar formulário ─────────────────────────────────────────────

  const resetForm = () => {
    setForm(FORM_VAZIO)
    setLocalizacao(null)
    setEditandoId(null)
    setErroForm(null)
    setModoLoc('gps')
    setAvisoGPS(null)
  }

  const abrirNovo = () => {
    resetForm()
    setMostrarForm(true)
  }

  const abrirEdicao = (sensor) => {
    setForm({
      nome:      sensor.nome,
      tipo:      sensor.tipo,
      descricao: sensor.descricao || '',
      bairro:    sensor.bairro ?? '',
      ativo:     sensor.ativo,
    })
    // Pré-preenche localização com o que está salvo — o admin pode trocar se quiser.
    setLocalizacao({
      lat:      parseFloat(sensor.lat),
      lng:      parseFloat(sensor.lng),
      endereco: sensor.bairro_nome
        ? `${sensor.bairro_nome} (localização salva)`
        : `${Number(sensor.lat).toFixed(5)}, ${Number(sensor.lng).toFixed(5)}`,
      fonte: 'salvo',
    })
    setEditandoId(sensor.id)
    setErroForm(null)
    setModoLoc('gps')
    setAvisoGPS(null)
    setMostrarForm(true)
  }

  const cancelar = () => {
    setMostrarForm(false)
    resetForm()
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  const salvar = async (e) => {
    e.preventDefault()
    if (!localizacao) {
      setErroForm('Defina a localização do sensor antes de salvar.')
      return
    }
    setErroForm(null)
    setSalvando(true)
    const payload = {
      nome:      form.nome.trim(),
      tipo:      form.tipo,
      descricao: form.descricao.trim(),
      lat:       localizacao.lat.toFixed ? localizacao.lat.toFixed(6) : localizacao.lat,
      lng:       localizacao.lng.toFixed ? localizacao.lng.toFixed(6) : localizacao.lng,
      bairro:    form.bairro || null,
      ativo:     form.ativo,
    }
    try {
      if (editandoId) {
        await sensoresService.editar(editandoId, payload)
      } else {
        await sensoresService.criar(payload)
      }
      await carregar()
      cancelar()
    } catch (err) {
      const detail = err?.response?.data
      setErroForm(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setSalvando(false)
    }
  }

  // ── Ações da tabela ───────────────────────────────────────────────────────

  const toggleAtivo = async (sensor) => {
    try {
      await sensoresService.editar(sensor.id, { ativo: !sensor.ativo })
      setLista((prev) =>
        prev.map((s) => (s.id === sensor.id ? { ...s, ativo: !s.ativo } : s)),
      )
    } catch {
      // silencia — o usuário pode tentar de novo
    }
  }

  const excluir = async (sensor) => {
    if (!window.confirm(`Excluir sensor "${sensor.nome}"? Esta ação não pode ser desfeita.`)) return
    setExcluindoId(sensor.id)
    try {
      await sensoresService.excluir(sensor.id)
      setLista((prev) => prev.filter((s) => s.id !== sensor.id))
    } catch {
      alert('Não foi possível excluir o sensor.')
    } finally {
      setExcluindoId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Gestão de Sensores IoT</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {lista.length} sensor{lista.length !== 1 ? 'es' : ''} cadastrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Novo sensor
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">
            {editandoId ? 'Editar sensor' : 'Cadastrar novo sensor'}
          </h2>
          <form onSubmit={salvar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Sensor Canal Beberibe — Ponto 1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tipo *
              </label>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_SENSOR.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icone} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Bairro
              </label>
              <select
                value={form.bairro}
                onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value || '' }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem bairro</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Localização — GPS ou CEP */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Localização *
              </label>

              {/* Localização confirmada */}
              {localizacao ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2 text-sm">
                  <span className="text-emerald-600 font-semibold mt-0.5">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-emerald-900 font-medium">Localização definida</div>
                    <div className="text-emerald-800 text-xs mt-0.5 truncate">
                      {localizacao.endereco}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalizacao(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 underline shrink-0"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Seletor GPS / CEP */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg" role="tablist">
                    {[
                      { value: 'gps', rotulo: '📍 GPS' },
                      { value: 'cep', rotulo: '🏠 CEP' },
                    ].map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        role="tab"
                        aria-selected={modoLoc === m.value}
                        onClick={() => { setModoLoc(m.value); setAvisoGPS(null) }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          modoLoc === m.value
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m.rotulo}
                      </button>
                    ))}
                  </div>

                  {/* GPS */}
                  {modoLoc === 'gps' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleUsarGPS}
                        disabled={obtendoGPS}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition text-sm font-medium"
                      >
                        {obtendoGPS ? 'Obtendo localização...' : '📍 Usar minha localização'}
                      </button>
                      {avisoGPS && (
                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {avisoGPS}{' '}
                          <button
                            type="button"
                            onClick={() => setModoLoc('cep')}
                            className="underline font-medium"
                          >
                            Buscar por CEP
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {/* CEP */}
                  {modoLoc === 'cep' && (
                    <BuscaCEP onLocalizado={handleLocalizadoPorCEP} />
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descrição{' '}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Localização exata, observações, responsável..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Ativo */}
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo-check"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="ativo-check" className="text-sm text-slate-700">
                Sensor ativo (aparece no mapa)
              </label>
            </div>

            {erroForm && (
              <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-sm">
                {erroForm}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelar}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mensagem de erro geral */}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {erro}
        </div>
      )}

      {carregando && (
        <div className="text-sm text-slate-500 py-8 text-center">Carregando sensores...</div>
      )}

      {!carregando && lista.length === 0 && !erro && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-500 text-sm">
          Nenhum sensor cadastrado ainda.
          <br />
          <button
            onClick={abrirNovo}
            className="mt-3 text-blue-600 hover:underline font-medium"
          >
            Cadastrar o primeiro sensor
          </button>
        </div>
      )}

      {!carregando && lista.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Bairro</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((sensor) => (
                <tr key={sensor.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span className="mr-1.5">{iconeSensor(sensor.tipo)}</span>
                    {sensor.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                    {sensor.tipo_display}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    {sensor.bairro_nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAtivo(sensor)}
                      title={sensor.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition ${
                        sensor.ativo
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${sensor.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {sensor.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEdicao(sensor)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(sensor)}
                        disabled={excluindoId === sensor.id}
                        className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                      >
                        {excluindoId === sensor.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
