import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

/**
 * Em redes corporativas com SSL inspection, o Node/axios falham com
 * "self-signed certificate in certificate chain".
 * Defina ALLOW_INSECURE_TLS=true no .env para contornar (apenas em dev/local).
 */
export const allowInsecureTls =
  process.env.ALLOW_INSECURE_TLS === 'true' ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

export const insecureHttpsAgent = allowInsecureTls
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;
