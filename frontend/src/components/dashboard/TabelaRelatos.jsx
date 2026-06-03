/**
 * Tabela de relatos recentes do painel (US06).
 *
 * Colunas: hora/data, bairro, nível, autor, descrição, foto.
 * Foto é um thumbnail clicável que abre o lightbox modal.
 */

import { useEffect, useState } from 'react'

import { ROTULOS_NIVEL } from '../../lib/relatos'

const CORES_NIVEL = {
  baixo: 'bg-emerald-100 text-emerald-800',
  medio: 'bg-amber-100 text-amber-800',
  alto: 'bg-red-100 text-red-800',
}

const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})

export function TabelaRelatos({ relatos }) {
  const [imagemAberta, setImagemAberta] = useState(null)

  // Esc fecha o lightbox; trava o scroll do body enquanto aberto.
  useEffect(() => {
    if (!imagemAberta) return
    const onKey = (e) => {
      if (e.key === 'Escape') setImagemAberta(null)
    }
    document.addEventListener('keydown', onKey)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
    }
  }, [imagemAberta])

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Relatos recentes
          </h3>
          {relatos.length > 0 && (
            <span className="text-xs text-slate-500 tabular-nums">
              {relatos.length} {relatos.length === 1 ? 'relato' : 'relatos'}
            </span>
          )}
        </div>

        {relatos.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">
            Sem relatos na janela atual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-2 font-medium">Quando</th>
                  <th className="text-left px-5 py-2 font-medium">Bairro</th>
                  <th className="text-left px-5 py-2 font-medium">Nível</th>
                  <th className="text-left px-5 py-2 font-medium">Autor</th>
                  <th className="text-left px-5 py-2 font-medium">Descrição</th>
                  <th className="text-left px-5 py-2 font-medium">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relatos.map((r) => {
                  const data = new Date(r.created_at)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-slate-800 font-medium tabular-nums">
                          {fmtHora.format(data)}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {fmtData.format(data)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {r.bairro?.nome || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CORES_NIVEL[r.nivel]}`}
                        >
                          {ROTULOS_NIVEL[r.nivel]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {r.user?.nome || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-md">
                        {r.descricao ? (
                          <span className="line-clamp-2">{r.descricao}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {r.imagem ? (
                          <button
                            type="button"
                            onClick={() => setImagemAberta(r.imagem)}
                            className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                            aria-label="Abrir foto do relato"
                          >
                            <img
                              src={r.imagem}
                              alt=""
                              loading="lazy"
                              className="w-12 h-12 object-cover rounded-md border border-slate-200 hover:opacity-80 transition"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {imagemAberta && (
        <Lightbox src={imagemAberta} onClose={() => setImagemAberta(null)} />
      )}
    </>
  )
}

function Lightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Foto do relato"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition"
        aria-label="Fechar"
      >
        ✕
      </button>
      <img
        src={src}
        alt="Foto do relato"
        className="max-w-full max-h-full rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
