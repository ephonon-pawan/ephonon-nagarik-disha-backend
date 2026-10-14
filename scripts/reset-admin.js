import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

let connection;
try {
  const email = z.string().trim().email().max(254).parse(process.argv[2]).toLowerCase();
  const password = z.string().min(12).max(256).parse(
    process.env.ADMIN_PASSWORD || `Test@${randomBytes(12).toString('base64url')}9a`,
  );
  connection = await pool.getConnection();
  await connection.beginTransaction();
  const [admins] = await connection.execute('SELECT id FROM admins WHERE email=? FOR UPDATE', [email]);
  if (!admins.length) throw new Error('Admin email does not exist in this database.');
  const hash = await hashPassword(password);
  await connection.execute('UPDATE admins SET password_hash=? WHERE id=?', [hash, admins[0].id]);
  const [updated] = await connection.execute('SELECT password_hash FROM admins WHERE id=?', [admins[0].id]);
  if (!await verifyPassword(password, updated[0].password_hash)) throw new Error('Password verification failed.');
  await connection.execute('DELETE FROM admin_sessions WHERE admin_id=?', [admins[0].id]);
  await connection.commit();
  console.log(`Admin password reset and verified in ${config.database.host}/${config.database.database}.`);
  console.log(`Email: ${email}\nPassword: ${password}`);
} catch (error) {
  if (connection) await connection.rollback();
  console.error('Admin reset failed:', error.code || error.message);
  process.exitCode = 1;
} finally {
  if (connection) connection.release();
  await pool.end();
}
