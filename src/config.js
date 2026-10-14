
import 'dotenv/config';
import { developmentOrigins } from './origins.js';

const database = process.env.DB_NAME || 'nagrik_disha';

if (!/^[a-zA-Z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME must contain only letters, digits or underscores.');
}

export const config = {
  port: Number(process.env.PORT || 4000),

  host: process.env.HOST || '0.0.0.0',

  origins: (
    process.env.FRONTEND_ORIGIN ||
    developmentOrigins.join(',')
  ).split(',').map(s => s.trim()).filter(Boolean),

  adminKey: process.env.ADMIN_API_KEY,

  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database,
    user: process.env.DB_USER || 'nagrik_disha',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    timezone: 'Z',
    dateStrings: true,

    ssl: process.env.DB_SSL === 'true'
      ? { minVersion: 'TLSv1.2' }
      : undefined,
  },
};

