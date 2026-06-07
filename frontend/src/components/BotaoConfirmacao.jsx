import { useState } from 'react'
import { relatos as relatosService } from '../lib/relatos'

export function BotaoConfirmacao({ relatoId, totalInicial = 0, jaConfirmouInicial = false }) {
  const [jaConfirmou, setJaConfirmou] = useState(jaConfirmouInicial)
  const [total, setTotal] = useState(totalInicial)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      if (jaConfirmou) {
        const data = await relatosService.desconfirmar(relatoId)
        setTotal(data.total_confirmacoes)
        setJaConfirmou(false)
      } else {
        const data = await relatosService.confirmar(relatoId)
        setTotal(data.total_confirmacoes)
        setJaConfirmou(true)
      }
    } catch (err) {
      console.error('Erro ao confirmar relato:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        title={jaConfirmou ? 'Desfazer confirmação' : 'Confirmar que este alerta é real'}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all disabled:opacity-50 ${
          jaConfirmou
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 1 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
        </svg>
        {jaConfirmou ? 'Confirmado' : 'Confirmar'}
      </button>

      {total > 0 && (
        <span className="text-[11px] text-slate-400">
          {total} {total === 1 ? 'confirmação' : 'confirmações'}
        </span>
      )}
    </div>
  )
}
