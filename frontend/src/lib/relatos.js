/**
 * Service de relatos de alagamento (US04).
 *
 * Camada fina sobre o axios `api` — mantém as páginas livres de detalhes
 * de HTTP e centraliza qualquer normalização de payload/resposta.
 */

import { api } from './api'

export const relatos = {
  criar: (payload) => api.post('/api/relatos/', payload).then((r) => r.data),
  listar: (params) =>
    api.get('/api/relatos/', { params }).then((r) => r.data),
  detalhe: (id) => api.get(`/api/relatos/${id}/`).then((r) => r.data),
}

export const NIVEIS = [
  {
    valor: 'baixo',
    rotulo: 'Baixo',
    descricao: 'Poças, água no meio-fio',
    cor: 'emerald',
  },
  {
    valor: 'medio',
    rotulo: 'Médio',
    descricao: 'Cobre a calçada / parte da rua',
    cor: 'amber',
  },
  {
    valor: 'alto',
    rotulo: 'Alto',
    descricao: 'Rua intransitável, água entrando em imóveis',
    cor: 'red',
  },
]
