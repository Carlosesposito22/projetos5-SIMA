/**
 * Painel COP — visão operacional em tempo real (inspirado no Painel COP do Recife).
 * Rota: /dashboard/painel-cop
 * Polling de 60s. Dados de clima via OpenWeatherMap (backend proxy).
 */

import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

const INTERVALO = 60_000

// ── helpers ──────────────────────────────────────────────────────────────

function calcIndiceCalor(t, h) {
  if (t == null || h == null) return null
  // Fórmula simplificada de Steadman (°C)
  const ic = -8.78469475556
    + 1.61139411 * t
    + 2.33854883889 * h
    - 0.14611605 * t * h
    - 0.012308094 * t * t
    - 0.0164248277778 * h * h
    + 0.002211732 * t * t * h
    + 0.00072546 * t * h * h
    - 0.000003582 * t * t * h * h
  return Math.round(ic)
}

function nivelCalor(ic) {
  if (ic == null) return { label: '—', cor: '#6b7280' }
  if (ic < 27)   return { label: 'Conforto',  cor: '#10b981' }
  if (ic < 32)   return { label: 'Cuidado',   cor: '#f59e0b' }
  if (ic < 41)   return { label: 'Perigo',    cor: '#ef4444' }
  return           { label: 'Extremo',  cor: '#7c3aed' }
}

function qualidadeAr(/* placeholder */) {
  return 'BOA' // integrar AQI depois
}

function fmt(v, sufixo = '') {
  if (v == null) return '—'
  return `${v}${sufixo}`
}

function tempoAtras(dt) {
  if (!dt) return ''
  const seg = Math.round((Date.now() / 1000) - dt)
  if (seg < 60) return `há ${seg}s`
  return `há ${Math.round(seg / 60)}min`
}

// ── componentes ───────────────────────────────────────────────────────────

function Card({ titulo, valor, sub, cor = '#1e293b', largura = 1, atualizado }) {
  return (
    <div
      style={{ backgroundColor: cor, gridColumn: `span ${largura}` }}
      className="rounded-lg p-4 flex flex-col justify-between min-h-[110px]"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{titulo}</p>
      <div>
        <p className="text-3xl font-bold text-white leading-tight">{valor}</p>
        {sub && <p className="text-sm text-white/80 mt-0.5">{sub}</p>}
      </div>
      {atualizado && (
        <p className="text-[10px] text-white/50 mt-1">{tempoAtras(atualizado)}</p>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[110px] rounded-lg bg-slate-200" />
      ))}
    </div>
  )
}

// ── página ────────────────────────────────────────────────────────────────

export function PainelCOP() {
  const [clima, setClima] = useState(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get('/api/clima/atual/')
      setClima(data)
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
    const id = setInterval(buscar, INTERVALO)
    return () => clearInterval(id)
  }, [buscar])

  const ic = calcIndiceCalor(clima?.temp, clima?.humidade)
  const { label: labelCalor, cor: corCalor } = nivelCalor(ic)

  // Estágio baseado em chuva
  const chuva1h = clima?.chuva_1h ?? 0
  let estagio = { label: 'Normalidade', cor: '#16a34a', desc: 'Sem chuva significativa na última hora em Recife.' }
  if (chuva1h >= 50)      estagio = { label: 'Emergência', cor: '#7c3aed', desc: 'Chuva extrema. Risco máximo.' }
  else if (chuva1h >= 30) estagio = { label: 'Crítico',    cor: '#ef4444', desc: 'Chuva intensa. Alto risco de alagamentos.' }
  else if (chuva1h >= 15) estagio = { label: 'Alerta',     cor: '#f59e0b', desc: 'Chuva moderada. Monitoramento ativo.' }
  else if (chuva1h >= 5)  estagio = { label: 'Atenção',    cor: '#3b82f6', desc: 'Chuva fraca. Situação sob controle.' }

  return (
    <div className="space-y-4">
      {/* Estágio atual */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ backgroundColor: estagio.cor }}
        >
          {estagio.label[0]}
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Estágio atual</p>
          <p className="text-2xl font-bold" style={{ color: estagio.cor }}>{estagio.label}</p>
          <p className="text-sm text-slate-600">{estagio.desc}</p>
        </div>
      </div>

      {erro && !carregando && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-sm">
          Falha ao atualizar dados meteorológicos. Tentando novamente em instantes…
        </div>
      )}

      {carregando ? <Skeleton /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Linha 1 — chuva */}
          <Card
            titulo="Chuva última 1h"
            valor={fmt(clima?.chuva_1h, ' mm')}
            sub={chuva1h === 0 ? 'Sem chuva' : 'acumulado'}
            cor={chuva1h === 0 ? '#16a34a' : chuva1h < 15 ? '#2563eb' : '#ef4444'}
            atualizado={clima?.atualizado}
          />
          <Card
            titulo="Chuva últimas 3h"
            valor={fmt(clima?.chuva_3h, ' mm')}
            sub="acumulado"
            cor="#1e40af"
            atualizado={clima?.atualizado}
          />
          <Card
            titulo="Temperatura"
            valor={fmt(clima?.temp, ' °C')}
            sub={clima?.descricao}
            cor="#0f766e"
            atualizado={clima?.atualizado}
          />
          <Card
            titulo="Sensação térmica"
            valor={fmt(clima?.sensacao, ' °C')}
            sub={`Humidade ${fmt(clima?.humidade, '%')}`}
            cor="#0369a1"
            atualizado={clima?.atualizado}
          />

          {/* Linha 2 — outros */}
          <Card
            titulo="Velocidade dos ventos"
            valor={fmt(clima?.vento_kmh, ' km/h')}
            cor="#7c3aed"
            atualizado={clima?.atualizado}
          />
          <Card
            titulo="Qualidade do ar"
            valor={qualidadeAr()}
            sub="índice AQI"
            cor="#065f46"
          />
          <Card
            titulo="Índice de calor"
            valor={ic != null ? `${ic} °C` : '—'}
            sub={labelCalor}
            cor={corCalor}
            atualizado={clima?.atualizado}
          />
          <Card
            titulo="Abrigos ativos"
            valor="—"
            sub="integrar US08"
            cor="#475569"
          />
        </div>
      )}

      <p className="text-xs text-slate-400 text-right">
        Fonte: OpenWeatherMap — Recife, PE · atualização a cada 60s
      </p>
    </div>
  )
}
