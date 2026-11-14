import type { PoolConfig } from 'mariadb';

/** Parámetros de la URL que piden conexión cifrada (Prisma CLI usa sslaccept; otros clientes, ssl o ssl-mode). */
const PARAMETROS_SSL = ['ssl', 'sslaccept', 'sslmode', 'ssl-mode'];

/**
 * Configuración de la conexión a MySQL a partir de DATABASE_URL.
 *
 * - En la PC (sin SSL): se usa la URL tal cual, como siempre.
 * - En la nube (Aiven exige SSL): si DATABASE_SSL=true, la URL trae un parámetro de SSL o hay un certificado
 *   en DATABASE_SSL_CA, se arma la configuración con cifrado. Con el certificado (CA) de Aiven se verifica
 *   el servidor; sin él, la conexión va cifrada pero sin verificar el certificado.
 */
export function configuracionConexion(
  env: NodeJS.ProcessEnv = process.env,
): string | PoolConfig {
  const url = env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  const u = new URL(url);
  const ca = env.DATABASE_SSL_CA?.replace(/\\n/g, '\n').trim() || undefined;
  const conSsl =
    env.DATABASE_SSL === 'true' ||
    Boolean(ca) ||
    PARAMETROS_SSL.some((p) => u.searchParams.has(p));
  if (!conSsl) return url;

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    // El plan gratis de Aiven admite pocas conexiones: un grupo chico alcanza.
    connectionLimit: Number(env.DATABASE_CONNECTION_LIMIT ?? 5),
  };
}
