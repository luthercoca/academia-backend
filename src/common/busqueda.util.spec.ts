import { comoNumero, porPalabras } from './busqueda.util.js';

describe('porPalabras', () => {
  it('sin texto no agrega filtro', () => {
    expect(porPalabras(undefined, (p) => [{ a: p }])).toEqual({});
    expect(porPalabras('   ', (p) => [{ a: p }])).toEqual({});
  });

  it('cada palabra debe aparecer en alguno de los campos', () => {
    expect(porPalabras(' juan  perez ', (p) => [{ n: p }, { a: p }])).toEqual({
      AND: [
        { OR: [{ n: 'juan' }, { a: 'juan' }] },
        { OR: [{ n: 'perez' }, { a: 'perez' }] },
      ],
    });
  });

  it('toma como máximo 6 palabras', () => {
    expect(porPalabras('a b c d e f g h', (p) => [{ x: p }]).AND).toHaveLength(
      6,
    );
  });
});

describe('comoNumero', () => {
  it('reconoce notas con punto o coma', () => {
    expect(comoNumero('78')).toBe(78);
    expect(comoNumero('72,5')).toBe(72.5);
    expect(comoNumero('Juan')).toBeUndefined();
  });
});
