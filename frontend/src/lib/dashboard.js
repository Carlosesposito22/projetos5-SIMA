/**
 * Service do painel da Defesa Civil (US06).
 *
 * Fina camada sobre o axios `api`. O endpoint devolve totais agregados,
 * contagens por nível nas últimas 24h, top de bairros críticos e o
 * timestamp do último relato.
 */

import { api } from './api'

export const dashboard = {
  resumo:        () => api.get('/api/dashboard/resumo/').then((r) => r.data),
  alertasBairros: () => api.get('/api/alertas/bairros/').then((r) => r.data),
  resolverAlerta: (id) => api.post(`/api/alertas/bairros/${id}/resolver/`).then((r) => r.data),
}
