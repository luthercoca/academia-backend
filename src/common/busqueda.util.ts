/** Hasta cuántas palabras se toman de la búsqueda (evita consultas enormes). */
const MAXIMO_PALABRAS = 6;

/**
 * Búsqueda por contenido, palabra por palabra: cada palabra debe aparecer en alguno de los campos.
 * «juan perez» encuentra a «Juan Bruno Pérez Mamani» (nombres y apellidos en columnas distintas). La comparación
 * no distingue mayúsculas ni tildes porque la base usa la intercalación utf8mb4_unicode_ci.
 *
 * Devuelve un filtro para mezclar con el `where` del servicio (`{ ...filtros, ...porPalabras(q, campos) }`),
 * o un objeto vacío si no hay texto.
 */
export function porPalabras<W>(
  q: string | undefined,
  campos: (palabra: string) => W[],
): { AND?: { OR: W[] }[] } {
  const palabras = (q ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAXIMO_PALABRAS);
  if (palabras.length === 0) return {};
  return { AND: palabras.map((palabra) => ({ OR: campos(palabra) })) };
}

/** Si la palabra es un número (p. ej. una nota), su valor; si no, undefined. */
export function comoNumero(palabra: string): number | undefined {
  const n = Number(palabra.replace(',', '.'));
  return palabra.trim() !== '' && Number.isFinite(n) ? n : undefined;
}
