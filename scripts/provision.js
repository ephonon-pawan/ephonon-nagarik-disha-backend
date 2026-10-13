// Run as a MySQL administrator. Credentials are generated locally, never printed.
import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
const envPath=new URL('../.env',import.meta.url);
try{await readFile(envPath);throw new Error('.env already exists. Provisioning stopped to preserve existing credentials.');}catch(error){if(error.code!=='ENOENT')throw error;}
const connection=await mysql.createConnection({socketPath:process.env.MYSQL_ADMIN_SOCKET || '/var/run/mysqld/mysqld.sock',user:process.env.MYSQL_ADMIN_USER || 'root',password:process.env.MYSQL_ADMIN_PASSWORD || ''});
const password=randomBytes(32).toString('hex');const key=randomBytes(32).toString('hex');
try {
 await connection.query('CREATE DATABASE IF NOT EXISTS nagrik_disha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 // CREATE USER deliberately fails if this account already exists; never replace its password.
 await connection.query("CREATE USER 'nagrik_disha'@'localhost' IDENTIFIED BY ?",[password]);
 await connection.query("GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES ON nagrik_disha.* TO 'nagrik_disha'@'localhost'");
 await writeFile(envPath,`PORT=4000\nHOST=127.0.0.1\nFRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_NAME=nagrik_disha\nDB_USER=nagrik_disha\nDB_PASSWORD=${password}\nADMIN_API_KEY=${key}\n`,{mode:0o600,flag:'wx'});
 console.log('Database and application user created. Credentials saved privately to backend .env. Next: npm run db:setup && npm run db:seed');
}finally{await connection.end();}
