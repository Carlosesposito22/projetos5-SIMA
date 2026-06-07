/**
 * Página de relatos do usuário autenticado — com editar e deletar.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MenuPerfil } from '../components/MenuPerfil'
import { api } from '../lib/api'
import { relatos as relatosService } from '../lib/relatos'

const JANELA_HORAS_PADRAO = '24'
const INTERVALO_POLLING_MS = 30_000

const NIVEL = {
  baixo: {
    label: 'Atenção',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500 shadow-',
    card: 'border-l-emerald-400',
  },
  medio: {
    label: 'Alerta',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
    card: 'border-l-amber-400',
  },
  alto: {
    label: 'Crítico',
    badge: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
    card: 'border-l-red-400',
  },
}

const OPCOES_NIVEL = ['baixo', 'medio', 'alto']

// ── Modal de confirmação de exclusão ────────────────────────────────────────
function ModalConfirmar({ onConfirmar, onCancelar, carregando }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-800">Excluir relato?</h2>
          <p className="text-sm text-slate-500">Essa ação não pode ser desfeita.</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={carregando}
            className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={carregando}
            className="cursor-pointer px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {carregando && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de relato ───────────────────────────────────────────────────────────
function RelatoCard({ relato, onAtualizado, onDeletado }) {
  const cfg = NIVEL[relato.nivel] ?? NIVEL.baixo
  const data = new Date(relato.created_at)
  const dataStr = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const horaStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const [editando, setEditando] = useState(false)
  const [confirmarDelete, setConfirmarDelete] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [erroCard, setErroCard] = useState(null)
  const [imagemAberta, setImagemAberta] = useState(false)

  // Estado do formulário de edição
  const [nivel, setNivel] = useState(relato.nivel)
  const [descricao, setDescricao] = useState(relato.descricao ?? '')

  const handleSalvar = async () => {
    setSalvando(true)
    setErroCard(null)
    try {
      const { data: atualizado } = await api.patch(`/api/relatos/${relato.id}/`, { nivel, descricao })
      setEditando(false)
      onAtualizado(atualizado)
    } catch {
      setErroCard('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const handleCancelar = () => {
    setNivel(relato.nivel)
    setDescricao(relato.descricao ?? '')
    setErroCard(null)
    setEditando(false)
  }

  const handleDeletar = async () => {
    setDeletando(true)
    try {
      await api.delete(`/api/relatos/${relato.id}/`)
      onDeletado(relato.id)
    } catch {
      setErroCard('Não foi possível excluir. Tente novamente.')
      setDeletando(false)
      setConfirmarDelete(false)
    }
  }

  const cfgAtual = NIVEL[nivel] ?? NIVEL.baixo

  return (
    <>
      {confirmarDelete && (
        <ModalConfirmar
          onConfirmar={handleDeletar}
          onCancelar={() => setConfirmarDelete(false)}
          carregando={deletando}
        />
      )}

      <div className={`bg-white rounded-xl border-l-4 ${editando ? 'border-l-blue-400' : cfg.card} border border-slate-200 shadow-sm p-5 flex flex-col gap-3 transition-all`}>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {editando ? (
              // Selector de nível no modo edição
              <div className="flex gap-1.5">
                {OPCOES_NIVEL.map(op => {
                  const c = NIVEL[op]
                  return (
                    <button
                      key={op}
                      onClick={() => setNivel(op)}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                        nivel === op ? c.badge + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            )}
            {relato.bairro && !editando && (
              <span className="text-sm text-slate-700 font-medium">{relato.bairro.nome}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!editando && (
              <>
                <div className="text-right mr-2">
                  <p className="text-sm text-slate-700 font-medium">{dataStr}</p>
                  <p className="text-xs text-slate-500">{horaStr}</p>
                </div>
                {/* Botão editar */}
                <button
                  onClick={() => setEditando(true)}
                  title="Editar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931z"/>
                  </svg>
                </button>
                {/* Botão deletar */}
                <button
                  onClick={() => setConfirmarDelete(true)}
                  title="Excluir"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Corpo — descrição ou textarea */}
        {editando ? (
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={3}
            placeholder="Descrição (opcional)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        ) : (
          relato.descricao && (
            <p className="text-sm text-slate-700 leading-relaxed">{relato.descricao}</p>
          )
        )}

        {relato.imagem && (
          <>
            <button
              type="button"
              onClick={() => setImagemAberta(true)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 w-full text-left"
            >
              <img
                src={relato.imagem}
                alt="Imagem do relato"
                className="w-full h-48 object-cover transition duration-200 hover:opacity-90"
              />
            </button>

            {imagemAberta && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                role="dialog"
                aria-modal="true"
                onClick={() => setImagemAberta(false)}
              >
                <div className="relative max-w-[95vw] max-h-[95vh]">
                  <img
                    src={relato.imagem}
                    alt="Imagem do relato"
                    className="w-full h-auto max-h-[95vh] rounded-3xl shadow-2xl"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagemAberta(false)
                    }}
                    className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/80"
                    aria-label="Fechar imagem"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Erro inline */}
        {erroCard && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroCard}</p>
        )}

        {/* Rodapé */}
        {editando ? (
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={handleCancelar}
              disabled={salvando}
              className="px-4 py-1.5 rounded-lg text-white font-medium border border-slate-200 text-slate-600 hover:bg-gray-600 transition disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="cursor-pointer px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {salvando && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Salvar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 pt-1 bg">
            {relato.lat && relato.lng && (
              <a
                href={`https://maps.google.com/?q=${relato.lat},${relato.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                Ver no mapa
              </a>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Card de resumo por nível ─────────────────────────────────────────────────
function ResumoNivel({ nivel, count }) {
  const cfg = NIVEL[nivel]
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-1.5">
      <span className="text-2xl font-bold text-slate-800">{count}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.badge} rounded-full px-2 py-0.5 w-fit`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export function Alertas() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroHoras, setFiltroHoras] = useState(JANELA_HORAS_PADRAO)
  const canceladoRef = useRef(false)

  useEffect(() => {
    canceladoRef.current = false
    setCarregando(true)
    setErro(null)

    const buscar = async () => {
      try {
        const params = { meus: 'true' }
        if (filtroNivel) params.nivel = filtroNivel
        if (filtroHoras) params.ultimas_horas = filtroHoras

        const lista = await relatosService.listarTodos(params)
        if (canceladoRef.current) return
        setTodos(lista)
        setErro(null)
      } catch {
        if (!canceladoRef.current) setErro('Não foi possível carregar os relatos.')
      } finally {
        if (!canceladoRef.current) setCarregando(false)
      }
    }

    buscar()
    const id = setInterval(buscar, INTERVALO_POLLING_MS)
    return () => {
      canceladoRef.current = true
      clearInterval(id)
    }
  }, [filtroNivel, filtroHoras, user?.id])

  const handleAtualizado = (atualizado) =>
    setTodos(prev => prev.map(r => r.id === atualizado.id ? atualizado : r))

  const handleDeletado = (id) =>
    setTodos(prev => prev.filter(r => r.id !== id))

  const porNivel = {
    alto:  todos.filter(r => r.nivel === 'alto').length,
    medio: todos.filter(r => r.nivel === 'medio').length,
    baixo: todos.filter(r => r.nivel === 'baixo').length,
  }

  const FILTROS_NIVEL = [
    { value: '', label: 'Todos' },
    { value: 'alto', label: 'Crítico' },
    { value: 'medio', label: 'Alerta' },
    { value: 'baixo', label: 'Atenção' },
  ]

  const FILTROS_HORAS = [
    { value: '1',  label: 'Última 1h' },
    { value: '6',  label: 'Últimas 6h' },
    { value: '24', label: 'Últimas 24h' },
    { value: '72', label: 'Últimos 3 dias' },
    { value: '',   label: 'Todos' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shrink-0 z-10 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight">SIMA</Link>
          <MenuPerfil />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        <div>
          <h1 className="text-xl font-bold text-slate-800">Meus Relatos</h1>
          <p className="text-sm text-slate-500 mt-1">Ocorrências que você registrou no SIMA</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <ResumoNivel nivel="alto"  count={porNivel.alto} />
          <ResumoNivel nivel="medio" count={porNivel.medio} />
          <ResumoNivel nivel="baixo" count={porNivel.baixo} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nível</span>
            {FILTROS_NIVEL.map(op => (
              <button
                key={op.value}
                onClick={() => setFiltroNivel(op.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  filtroNivel === op.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Período</span>
            <select
              value={filtroHoras}
              onChange={e => setFiltroHoras(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FILTROS_HORAS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!carregando && !erro && (
          <p className="text-xs text-slate-400 -mt-3">
            {todos.length} {todos.length === 1 ? 'relato encontrado' : 'relatos encontrados'}
          </p>
        )}

        {carregando && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500 text-sm">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Carregando relatos...
          </div>
        )}

        {erro && !carregando && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{erro}</div>
        )}

        {!carregando && !erro && todos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Nenhum relato encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou registre uma ocorrência.</p>
            </div>
            <Link
              to="/reportar"
              className="mt-2 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-700 transition"
            >
              <span>＋</span> Reportar alagamento
            </Link>
          </div>
        )}

        {!carregando && !erro && todos.length > 0 && (
          <div className="flex flex-col gap-3">
            {todos.map(relato => (
              <RelatoCard
                key={relato.id}
                relato={relato}
                onAtualizado={handleAtualizado}
                onDeletado={handleDeletado}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
