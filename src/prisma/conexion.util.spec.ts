import { randomBytes } from 'node:crypto';
import { configuracionConexion } from './conexion.util.js';

// Valor al azar: en el repositorio no van contraseñas literales.
const CLAVE = randomBytes(9).toString('base64url');

describe('configuracionConexion', () => {
  it('en la PC (sin SSL) usa la URL tal cual', () => {
    const url = `mysql://root:${CLAVE}@localhost:3306/academia`;
    expect(configuracionConexion({ DATABASE_URL: url })).toBe(url);
  });

  it('con un parámetro de SSL en la URL arma una conexión cifrada', () => {
    const cfg = configuracionConexion({
      DATABASE_URL: `mysql://avnadmin:${CLAVE}@mysql-x.aivencloud.com:12345/defaultdb?sslaccept=accept_invalid_certs`,
    });
    expect(cfg).toMatchObject({
      host: 'mysql-x.aivencloud.com',
      port: 12345,
      user: 'avnadmin',
      password: CLAVE,
      database: 'defaultdb',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('con el certificado de Aiven verifica el servidor (y acepta \\n escritos)', () => {
    const cfg = configuracionConexion({
      DATABASE_URL: `mysql://u:${CLAVE}@h:1/db`,
      DATABASE_SSL_CA:
        '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----',
    });
    expect(cfg).toMatchObject({
      ssl: {
        ca: '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
        rejectUnauthorized: true,
      },
    });
  });

  it('decodifica caracteres especiales de la contraseña', () => {
    const cfg = configuracionConexion({
      DATABASE_URL: 'mysql://u:a%40b%23c@h:1/db',
      DATABASE_SSL: 'true',
    });
    expect(cfg).toMatchObject({ password: 'a@b#c' });
  });

  it('falla claro si falta DATABASE_URL', () => {
    expect(() => configuracionConexion({})).toThrow('Falta DATABASE_URL');
  });
});
