export const drosAbilities = [
  {
    id: 'toshoyo',
    name: 'Toshoyo',
    description: 'Genera fuego violeta a su alrededor que aumenta su fuerza física y velocidad.',
    targeting: { mode: 'self' },
    effects: [
      { type: 'state_add', state: 'toshoyo' },
      { type: 'modifier', modifier: { type: 'stat_multiplier', stat: 'strength', value: 1.2 } },
      { type: 'modifier', modifier: { type: 'stat_multiplier', stat: 'speed', value: 1.2 } },
    ],
    metadata: { source: 'legacy-profile', status: 'draft' },
  },
  {
    id: 'impulso-de-llama',
    name: 'Impulso de Llama',
    description: 'Concentra las llamas en sus piernas y espalda para realizar movimientos explosivos. Puede desaparecer momentáneamente de la vista del enemigo y reaparecer a su espalda.',
    targeting: { mode: 'single_enemy' },
    effects: [
      { type: 'modifier', modifier: { type: 'movement', mode: 'burst' } },
      { type: 'modifier', modifier: { type: 'position', mode: 'teleport_behind_target' } },
    ],
    metadata: { source: 'legacy-profile', status: 'draft', requires: ['positioning'] },
  },
  {
    id: 'colmillo-violeta',
    name: 'Colmillo Violeta',
    description: 'Dros libera una enorme cantidad de energía demoníaca en su katana y lanza un corte a distancia con forma de zorro de llamas violetas.',
    targeting: { mode: 'single_enemy' },
    effects: [
      { type: 'damage_resolve', multiplier: 1 },
      { type: 'state_add', state: 'bleeding', duration: 3, stacks: 1, target: 'target' },
    ],
    metadata: { source: 'legacy-profile', status: 'draft' },
  },
]

export const drosUltimate = {
  id: 'kitsune-no-oka',
  name: 'Kitsune no Ōka',
  description: 'Dros permite que el demonio se manifieste completamente detrás de él y concentra todo ese poder en su katana para realizar un corte gigantesco de fuego violeta.',
  costs: { energy: 100 },
  targeting: { mode: 'area_enemy' },
  effects: [
    { type: 'damage_resolve', multiplier: 1 },
    { type: 'state_add', state: 'bleeding', duration: 3, stacks: 1, target: 'enemy' },
  ],
  metadata: { source: 'legacy-profile', status: 'draft' },
}
