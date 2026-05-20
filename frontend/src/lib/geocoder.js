/**
 * Geocodificação fallback para quando o GPS do navegador não está disponível.
 *
 * Duas APIs públicas em sequência:
 *   1. ViaCEP    → CEP brasileiro vira endereço (rua, bairro, cidade, UF).
 *   2. Nominatim → endereço vira lat/lng (centróide se sem número da casa).
 *
 * Ambas são gratuitas e não exigem chave. Sem auth, sem proxy no Django
 * por enquanto — se virar gargalo, movemos pra cá depois.
 */

const VIACEP_URL = 'https://viacep.com.br/ws'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

export function limparCEP(cep) {
  return (cep || '').replace(/\D/g, '')
}

export function formatarCEP(cep) {
  const apenasNumeros = limparCEP(cep)
  if (apenasNumeros.length <= 5) return apenasNumeros
  return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5, 8)}`
}

/**
 * Consulta o ViaCEP. Resolve com { logradouro, bairro, localidade, uf } ou
 * rejeita com erro contendo `code`:
 *   - 'cep_invalido' → 8 dígitos não bateram
 *   - 'cep_nao_encontrado' → ViaCEP devolveu `{ erro: true }`
 *   - 'rede' → fetch falhou
 */
export async function buscarCEP(cep) {
  const limpo = limparCEP(cep)
  if (limpo.length !== 8) {
    throw Object.assign(new Error('CEP deve ter 8 dígitos.'), { code: 'cep_invalido' })
  }

  let response
  try {
    response = await fetch(`${VIACEP_URL}/${limpo}/json/`)
  } catch (err) {
    throw Object.assign(new Error('Falha de rede ao buscar CEP.'), { code: 'rede', cause: err })
  }

  if (!response.ok) {
    throw Object.assign(new Error('CEP não encontrado.'), { code: 'cep_nao_encontrado' })
  }

  const data = await response.json()
  if (data.erro) {
    throw Object.assign(new Error('CEP não encontrado.'), { code: 'cep_nao_encontrado' })
  }

  return {
    cep: data.cep,
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || '',
  }
}

/**
 * Geocodifica um endereço via Nominatim. Aceita os campos do ViaCEP +
 * `numero` opcional. Resolve com { lat, lng, displayName } ou rejeita
 * com erro:
 *   - 'sem_resultado' → endereço não encontrado pela OSM
 *   - 'rede' → fetch falhou
 *
 * Nominatim pede 1 req/seg + User-Agent identificável. Do browser, o
 * próprio User-Agent já satisfaz; pra carga maior teríamos que ir via
 * backend (cache + UA customizado).
 */
export async function geocodificarEndereco({ logradouro, numero, bairro, cidade, uf }) {
  const partes = [
    numero ? `${logradouro}, ${numero}` : logradouro,
    bairro,
    cidade,
    uf,
    'Brasil',
  ].filter(Boolean)

  const query = partes.join(', ')
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`

  let response
  try {
    response = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
  } catch (err) {
    throw Object.assign(new Error('Falha de rede ao geocodificar.'), { code: 'rede', cause: err })
  }

  if (!response.ok) {
    throw Object.assign(new Error('Geocoder retornou erro.'), { code: 'rede' })
  }

  const resultados = await response.json()
  if (!resultados.length) {
    throw Object.assign(new Error('Endereço não localizado.'), { code: 'sem_resultado' })
  }

  const [primeiro] = resultados
  return {
    lat: parseFloat(primeiro.lat),
    lng: parseFloat(primeiro.lon),
    displayName: primeiro.display_name,
  }
}

/**
 * Reverse geocoding: lat/lng → endereço legível (Nominatim).
 *
 * Usado pra dar feedback humano quando o GPS resolve a localização.
 * Falha aqui não é fatal — o caller deve cair num fallback genérico
 * ("Localização capturada via GPS").
 */
export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lng}&format=json&zoom=18`

  let response
  try {
    response = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
  } catch (err) {
    throw Object.assign(new Error('Falha de rede no reverse geocode.'), { code: 'rede', cause: err })
  }

  if (!response.ok) {
    throw Object.assign(new Error('Reverse geocoder retornou erro.'), { code: 'rede' })
  }

  const data = await response.json()
  if (!data.display_name) {
    throw Object.assign(new Error('Endereço não localizado.'), { code: 'sem_resultado' })
  }

  return {
    displayName: data.display_name,
    bairro: data.address?.suburb || data.address?.neighbourhood || '',
  }
}
