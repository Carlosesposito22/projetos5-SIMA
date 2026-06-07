import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { relatos as relatosService } from '../lib/relatos'
import { FlagIcon } from '@heroicons/react/24/solid'

export function BotaoDenuncia({ relatoId, totalInicial = 0, jaDenunciou: inicialDenunciou = false }) {
  const { user } = useAuth()
  const [total, setTotal] = useState(totalInicial)
  const [jaDenunciou, setJaDenunciou] = useState(inicialDenunciou)
  const [loading, setLoading] = useState(false)
  const [confirmacao, setConfirmacao] = useState(false)
  

  if (!user) return null

  const handleClick = async () => {
    setLoading(true)
    try {
      if (jaDenunciou) {
        const data = await relatosService.desfazerDenuncia(relatoId)
        setTotal(data.total_denuncias)
        setJaDenunciou(false)
      } else {
        const data = await relatosService.denunciar(relatoId)
        setTotal(data.total_denuncias)
        setJaDenunciou(true)
        setConfirmacao(true)
        setTimeout(() => setConfirmacao(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-2 mt-2 border-t border-slate-100">
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={handleClick}
          disabled={loading}
          title={jaDenunciou ? 'Desfazer denúncia' : 'Reportar como alerta falso'}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all disabled:opacity-50 ${jaDenunciou
              ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
            }`}
        >
          <FlagIcon className="w-3 h-3" />
          {jaDenunciou ? 'Denunciado' : 'Reportar erro'}
        </button>

        {total > 0 && (
          <span className="text-[11px] text-slate-400">
            {total} {total === 1 ? 'denúncia' : 'denúncias'}
          </span>
        )}
      </div>

      {confirmacao && (
        <p className="text-xs text-emerald-700 mt-1.5">
          ✓ Denúncia registrada. Obrigado!
        </p>
      )}
    </div>
  )
}
