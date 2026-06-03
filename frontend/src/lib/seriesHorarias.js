/**
 * Helpers de agregação dos relatos pros gráficos do painel (US06).
 *
 * Roda no client a partir da mesma lista que alimenta o mapa, evitando
 * uma chamada extra de API. Funções puras — todos os horários usam o
 * fuso do navegador (que pra o operador da Defesa Civil é Recife).
 */

import { ROTULOS_NIVEL } from './relatos'

const NIVEIS = ['baixo', 'medio', 'alto']

/**
 * Bucketiza relatos em janelas de 1h, do passado pro presente.
 * Cada bucket conta separadamente cada nível (pra empilhar no gráfico).
 */
export function gerarSerieHoraria(relatos, horas = 24) {
  const agora = new Date()
  const buckets = []

  for (let i = horas - 1; i >= 0; i--) {
    const t = new Date(agora.getTime() - i * 3600_000)
    buckets.push({
      hora: `${String(t.getHours()).padStart(2, '0')}h`,
      baixo: 0,
      medio: 0,
      alto: 0,
    })
  }

  for (const r of relatos) {
    const t = new Date(r.created_at)
    const horasAtras = Math.floor((agora - t) / 3600_000)
    if (horasAtras < 0 || horasAtras >= horas) continue
    const idx = horas - 1 - horasAtras
    const bucket = buckets[idx]
    if (!bucket || !NIVEIS.includes(r.nivel)) continue
    bucket[r.nivel]++
  }

  return buckets
}

/**
 * Conta relatos por nível e devolve só os níveis com pelo menos 1 ocorrência
 * (assim a pizza não vira fatia invisível pra zerados).
 */
export function gerarDistribuicaoNivel(relatos) {
  const contagem = { baixo: 0, medio: 0, alto: 0 }
  for (const r of relatos) {
    if (NIVEIS.includes(r.nivel)) contagem[r.nivel]++
  }
  return NIVEIS
    .filter((n) => contagem[n] > 0)
    .map((n) => ({ nivel: n, rotulo: ROTULOS_NIVEL[n], valor: contagem[n] }))
}

/**
 * Top N bairros por quantidade de relatos. Relatos sem bairro são ignorados.
 */
export function gerarTopBairros(relatos, limite = 8) {
  const contagem = new Map()
  for (const r of relatos) {
    if (!r.bairro?.nome) continue
    contagem.set(r.bairro.nome, (contagem.get(r.bairro.nome) || 0) + 1)
  }
  return Array.from(contagem.entries())
    .map(([bairro, total]) => ({ bairro, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite)
}
