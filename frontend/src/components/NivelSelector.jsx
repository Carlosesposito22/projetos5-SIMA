/**
 * Seletor de nível de alagamento (Baixo / Médio / Alto).
 *
 * Pill selector grande, tocável no celular. As cores antecipam o padrão
 * Atenção / Alerta / Emergência que vai aparecer no mapa (US03).
 *
 * Reutilizável: além do formulário de reportar (US04), serve como filtro
 * no mapa do cidadão (US01) e no dashboard da Defesa Civil (US06/US08).
 */

import { NIVEIS } from '../lib/relatos'

// Classes literais (Tailwind 4 precisa ver a string completa em build time —
// composição dinâmica tipo `bg-${cor}-500` não funciona).
const ESTILOS = {
  emerald: {
    selecionado: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200',
    bolinha: 'bg-emerald-500',
    texto: 'text-emerald-700',
  },
  amber: {
    selecionado: 'bg-amber-50 border-amber-500 ring-2 ring-amber-200',
    bolinha: 'bg-amber-500',
    texto: 'text-amber-700',
  },
  red: {
    selecionado: 'bg-red-50 border-red-500 ring-2 ring-red-200',
    bolinha: 'bg-red-500',
    texto: 'text-red-700',
  },
}

export function NivelSelector({ value, onChange, name = 'nivel' }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Nível do alagamento">
      {NIVEIS.map((nivel) => {
        const estilo = ESTILOS[nivel.cor]
        const ativo = value === nivel.valor
        return (
          <label
            key={nivel.valor}
            className={`cursor-pointer rounded-xl border-2 p-4 transition select-none ${
              ativo
                ? estilo.selecionado
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={nivel.valor}
              checked={ativo}
              onChange={() => onChange(nivel.valor)}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <span className={`inline-block w-3 h-3 rounded-full ${estilo.bolinha}`} />
              <span
                className={`font-semibold ${
                  ativo ? estilo.texto : 'text-slate-800'
                }`}
              >
                {nivel.rotulo}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{nivel.descricao}</p>
          </label>
        )
      })}
    </div>
  )
}
