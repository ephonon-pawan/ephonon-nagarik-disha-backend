import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
const scrypt = promisify(scryptCallback);
export const loginSchema = z.object({email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(256)}).strict();
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return `${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password,encoded){const [salt,hex]=encoded.split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(hex,'hex');return actual.length===expected.length && timingSafeEqual(actual,expected);}
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function createAuth(pool){
 return {
  async login(email,password){
   const [rows]=await pool.execute('SELECT id,email,password_hash AS passwordHash FROM admins WHERE email=?',[email]);
   // Perform password hashing even for unknown accounts.
   const dummy='00000000000000000000000000000000:'+ '0'.repeat(128);
   const valid=await verifyPassword(password,rows[0]?.passwordHash || dummy);if(!valid || !rows[0])return null;
   const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   await pool.execute('DELETE FROM admin_sessions WHERE expires_at<=UTC_TIMESTAMP()');
   await pool.execute('INSERT INTO admin_sessions (token_hash,admin_id,csrf_token,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',[tokenHash(token),rows[0].id,csrf]);
   return {token,user:{id:rows[0].id,email:rows[0].email},csrfToken:csrf};
  },
  async session(token){if(!/^[a-f0-9]{64}$/.test(token || ''))return null;const [rows]=await pool.execute('SELECT a.id,a.email,s.csrf_token AS csrfToken FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()',[tokenHash(token)]);return rows[0] || null;},
  async logout(token){if(token)await pool.execute('DELETE FROM admin_sessions WHERE token_hash=?',[tokenHash(token)]);},
 };
}
export function cookieToken(req){const value=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('nd_admin='));return value?.slice('nd_admin='.length);}
