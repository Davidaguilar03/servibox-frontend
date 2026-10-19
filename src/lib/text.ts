/** Minusculas y sin tildes, para buscar sin distinguir ninguna de las dos. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}
