import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { timingSafeEqual } from 'node:crypto';
import { schemas } from './validation.js';
import { cookieToken, loginSchema } from './auth.js';
import { developmentOrigins } from './origins.js';
export function createApp({repository,adminKey,auth,adminList,secureCookies=false,origins=developmentOrigins}) {
 const app=express(); app.disable('x-powered-by');app.use(helmet());app.use(cors({origin:origins,credentials:true}));app.use(express.json({limit:'100kb'}));
 app.get('/api/health',async(req,res)=>{try{await repository.ping();res.json({status:'ok',database:'connected'});}catch{res.status(503).json({error:'Database is unavailable.'});}});
 app.get('/api/catalog',async(req,res)=>res.json(await repository.catalog()));
 app.get('/api/sectors/:id/resources',async(req,res)=>res.json({resources:await repository.resources(req.params.id)}));
 app.use(['/api/auth','/api/admin'],(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 const cookieOptions={httpOnly:true,secure:secureCookies,sameSite:'lax',path:'/api',maxAge:8*60*60*1000};
 const attempts=new Map();
 const limiterCleanup=setInterval(()=>{const now=Date.now();for(const [ip,entry] of attempts)if(entry.until<now)attempts.delete(ip);},60000);limiterCleanup.unref();
 app.post('/api/auth/login',async(req,res)=>{
  if(!auth)return res.status(503).json({error:'Login is unavailable.'});
  if(req.get('origin') && !origins.includes(req.get('origin')))return res.status(403).json({error:'Origin is not allowed.'});
  const credentials=loginSchema.parse(req.body);const now=Date.now();let entry=attempts.get(req.ip);
  if(!entry || entry.until<now){entry={count:0,until:now+15*60*1000};attempts.set(req.ip,entry);}
  if(entry.count>=10)return res.status(429).json({error:'Too many login attempts. Try again in 15 minutes.'});
  entry.count++;const session=await auth.login(credentials.email,credentials.password);
  if(!session)return res.status(401).json({error:'Email or password is incorrect.'});
  attempts.delete(req.ip);res.cookie('nd_admin',session.token,cookieOptions);res.json({user:session.user,csrfToken:session.csrfToken});
 });
 app.get('/api/auth/me',async(req,res)=>{
  const session=await auth?.session(cookieToken(req));if(!session)return res.status(401).json({error:'Please sign in.'});
  res.json({user:{id:session.id,email:session.email},csrfToken:session.csrfToken});
 });
 app.post('/api/auth/logout',async(req,res)=>{
  const token=cookieToken(req);const session=await auth?.session(token);
  if(session && req.get('x-csrf-token')!==session.csrfToken)return res.status(403).json({error:'Invalid session request.'});
  await auth?.logout(token);res.clearCookie('nd_admin',{...cookieOptions,maxAge:undefined});res.status(204).end();
 });
 app.use('/api/admin',async(req,res,next)=>{
  const token=req.get('authorization')?.replace(/^Bearer /,'') || '';
  if(token && adminKey && adminKey.length>=32 && !adminKey.startsWith('replace_')){
   const actual=Buffer.from(token),expected=Buffer.from(adminKey);
   if(actual.length===expected.length && timingSafeEqual(actual,expected))return next();
  }
  const session=await auth?.session(cookieToken(req));
  if(!session)return res.status(401).json({error:'Please sign in.'});
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('x-csrf-token')!==session.csrfToken)return res.status(403).json({error:'Invalid session request. Please sign in again.'});
  next();
 });
 app.get('/api/admin/content',async(req,res)=>res.json(await adminList()));
 for(const [type,schema] of Object.entries(schemas)) {
  app.post(`/api/admin/${type}`,async(req,res)=>{
   const record=schema.parse(req.body);await repository.write(type,record);res.status(201).json({data:record});
  });
  app.put(`/api/admin/${type}/:id`,async(req,res)=>{
   const record=schema.parse({...req.body,id:req.params.id});
   if(!await repository.write(type,record,true)) return res.status(404).json({error:'Record not found.'});
   res.json({data:record});
  });
  app.delete(`/api/admin/${type}/:id`,async(req,res)=>{
   if(!await repository.remove(type,req.params.id)) return res.status(404).json({error:'Record not found.'});
   res.status(204).end();
  });
 }
 app.use((req,res)=>res.status(404).json({error:'Endpoint not found.'}));
 app.use((error,req,res,next)=>{
  if(error.name==='ZodError') return res.status(400).json({error:'Invalid request.',details:error.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
  if(error.type==='entity.parse.failed') return res.status(400).json({error:'Invalid JSON.'});
  if(error.type==='entity.too.large') return res.status(413).json({error:'Request body is too large.'});
  if(error.code==='ER_DUP_ENTRY') return res.status(409).json({error:'This record already exists.'});
  if(error.code==='ER_NO_REFERENCED_ROW_2') return res.status(400).json({error:'Referenced group, sector or section does not exist.'});
  console.error('API request failed:',error.code || error.name);
  res.status(503).json({error:'Service is temporarily unavailable. Please try again.'});
 });
 return app;
}
