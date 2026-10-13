import 'dotenv/config';
const database = process.env.DB_NAME || 'nagrik_disha';
if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('DB_NAME must contain only letters, digits or underscores.');
export const config = {
  port: Number(process.env.PORT || 4000), host: process.env.HOST || '127.0.0.1',
  origins: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()),
  adminKey: process.env.ADMIN_API_KEY,
  database: {host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), database, user: process.env.DB_USER || 'nagrik_disha', password: process.env.DB_PASSWORD || '', charset: 'utf8mb4', waitForConnections: true, connectionLimit: 10, connectTimeout: 5000, timezone: 'Z', dateStrings: true},
};
