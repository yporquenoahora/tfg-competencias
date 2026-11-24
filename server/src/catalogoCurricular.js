import { readFileSync } from 'node:fs';

const modulos = JSON.parse(readFileSync(
  new URL('../data/catalogo-curricular.json', import.meta.url),
  'utf8',
));

export const catalogoCurricular = new Map(modulos.map((modulo) => [modulo.id, modulo]));
