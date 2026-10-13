import {pool} from '../src/db.js';
import {hashPassword} from '../src/auth.js';
import {z} from 'zod';
const email=z.string().trim().email().max(254).parse(process.argv[2]).toLowerCase();
const password=z.string().min(12,'Use a password of at least 12 characters.').max(256).parse(process.env.ADMIN_PASSWORD);
try{const hash=await hashPassword(password);await pool.execute('INSERT INTO admins (email,password_hash) VALUES (?,?)',[email,hash]);console.log('Admin account created. Sign in at /admin/login.');}catch(error){if(error.code==='ER_DUP_ENTRY')console.error('This admin email already exists.');else console.error('Admin creation failed:',error.code || error.message);process.exitCode=1;}finally{await pool.end();}
