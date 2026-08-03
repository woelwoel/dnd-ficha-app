/**
 * Vocabulário de tipo de ação das manobras (Mestre de Combate) — é o contrato
 * entre o `type` do catálogo `phb-maneuvers-pt.json` e o `type` curado nas
 * options de manobra das fontes suplementares (`*-class-choices-pt.json`).
 *
 * `movimento` existe por causa de Engodo (Tasha): custa 1,5m de movimento no
 * seu turno, não é ação nem ação bônus. `manobra` é a sentinela para option
 * ainda sem tipo curado — selo neutro é melhor do que afirmar "passiva".
 *
 * Vive fora do ManeuversPanel porque o painel só exporta componente (regra do
 * react-refresh) e o guard-rail dos dados de Tasha checa este vocabulário.
 */
export const MANEUVER_TYPES = {
  'passiva':     { abbr: 'PAS',    color: 'bg-gray-100  border-gray-400  text-gray-700' },
  'ação':        { abbr: 'AÇÃO',   color: 'bg-amber-100 border-amber-400 text-amber-800' },
  'ação bônus':  { abbr: 'BÔNUS',  color: 'bg-blue-100  border-blue-400  text-blue-800' },
  'reação':      { abbr: 'REAÇÃO', color: 'bg-purple-100 border-purple-400 text-purple-800' },
  'movimento':   { abbr: 'MOV.',   color: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  'manobra':     { abbr: 'MAN.',   color: 'bg-gray-100  border-gray-400  text-gray-600' },
}
