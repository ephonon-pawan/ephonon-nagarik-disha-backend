import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { config } from '../src/config.js';
const { database, ...connectionOptions } = config.database;
const connection = await mysql.createConnection(connectionOptions);
try {
 await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
 await connection.query(`USE \`${database}\``);
 const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
 for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
 console.log('Database schema is ready.');
} finally { await connection.end(); }
