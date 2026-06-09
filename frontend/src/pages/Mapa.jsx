/**
 * Página inicial do app — mapa interativo de alagamentos (US01).
 *
 * Layout fullscreen:
 *  - Header com a marca SIMA e dropdown de perfil.
 *  - Mapa Leaflet ocupando o restante da viewport.
 *  - Botão flutuante "Reportar" no canto inferior direito.
 *  - Legenda de cores no canto inferior esquerdo.
 *
 * Dados:
 *  - Relatos das últimas 6h carregados via /api/relatos/?ultimas_horas=6.
 *  - Polling a cada 30s (TECNICO.md §1 — sem WebSockets no MVP).
 *  - Estados visuais para carregando, erro de rede e zero relatos.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { LegendaNiveis } from '../components/LegendaNiveis'
import { MapaRecife } from '../components/MapaRecife'
import { MenuPerfil } from '../components/MenuPerfil'
import { relatos as relatosService } from '../lib/relatos'
import { sensores as sensoresService } from '../lib/sensores'
// DEMO-MODE — remover antes de subir em produção (ver lib/demoMode.jsx)
import { BannerDemo, useDemoMode } from '../lib/demoMode'

const JANELA_HORAS = 6
const INTERVALO_POLLING_MS = 30_000

export function Mapa() {
  const [relatos, setRelatos] = useState([])
  const [sensores, setSensores] = useState([])
  const [carregandoInicial, setCarregandoInicial] = useState(true)
  const [erroPolling, setErroPolling] = useState(false)
  const canceladoRef = useRef(false)

  useEffect(() => {
    canceladoRef.current = false

    const buscar = async () => {
      try {
        const [lista, listaSensores] = await Promise.all([
          relatosService.listarTodos({ ultimas_horas: JANELA_HORAS }),
          sensoresService.listar({ ativo: 'true' }),
        ])
        if (canceladoRef.current) return
        setRelatos(lista)
        setSensores(listaSensores)
        setErroPolling(false)
      } catch {
        if (canceladoRef.current) return
        setErroPolling(true)
      } finally {
        if (!canceladoRef.current) setCarregandoInicial(false)
      }
    }

    buscar()
    const id = setInterval(buscar, INTERVALO_POLLING_MS)

    return () => {
      canceladoRef.current = true
      clearInterval(id)
    }
  }, [])

  // DEMO-MODE — mistura relatos e sensores falsos quando o modo demo está ativo
  const { ativo: demoAtivo, relatosFalsos, sensoresFalsos } = useDemoMode()
  const relatosExibidos  = demoAtivo ? [...relatos,  ...relatosFalsos]  : relatos
  const sensoresExibidos = demoAtivo ? [...sensores, ...sensoresFalsos] : sensores
  // FIM DEMO-MODE

  const semRelatos = !carregandoInicial && relatosExibidos.length === 0

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shrink-0 z-[1100] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 tracking-tight">
            SIMA
          </Link>
          <MenuPerfil />
        </div>
      </header>

      <main className="flex-1 relative">
        <MapaRecife relatos={relatosExibidos} sensores={sensoresExibidos} />

        <LegendaNiveis />

        {/* DEMO-MODE */}
        <BannerDemo />
        {/* FIM DEMO-MODE */}

        {carregandoInicial && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/40 z-[1000]"
            role="status"
            aria-live="polite"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 text-sm text-slate-700 flex items-center gap-3">
              <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Carregando relatos...
            </div>
          </div>
        )}

        {semRelatos && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full shadow-sm px-4 py-2 text-sm font-medium"
            role="status"
          >
            ✓ Tudo tranquilo — nenhum alagamento nas últimas {JANELA_HORAS}h
          </div>
        )}

        {erroPolling && !carregandoInicial && (
          <div
            className="absolute top-4 right-4 z-[1000] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg shadow-sm px-3 py-2 text-sm max-w-xs"
            role="alert"
          >
            Não foi possível atualizar agora. Tentando de novo em instantes...
          </div>
        )}

        <Link
          to="/reportar"
          className="absolute bottom-4 right-4 z-[1000] inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition"
          aria-label="Reportar alagamento"
        >
          <span aria-hidden="true">＋</span>
          Reportar
        </Link>
      </main>
    </div>
  )
}
