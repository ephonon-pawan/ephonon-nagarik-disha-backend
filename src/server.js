import { config } from './config.js';
import { pool } from './db.js';
import { createRepository } from './repository.js';
import { createApp } from './app.js';
import {createAuth} from './auth.js';
import {adminContent} from './admin-content.js';
const app=createApp({repository:createRepository(pool),adminKey:config.adminKey,origins:config.origins,auth:createAuth(pool),adminList:()=>adminContent(pool),secureCookies:process.env.NODE_ENV==='production'});
const server=app.listen(config.port,config.host,()=>console.log(`Nagrik Disha API: http://${config.host}:${config.port}`));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
