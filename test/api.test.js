import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
const key='a'.repeat(40);
test('creates generate unique IDs for all content types and edits preserve the route ID',async()=>{
 const {app,calls}=setup();
 const records={
  groups:{name:'Students',description:'Education',icon:'book'},
  sectors:{name:'Education',description:'Education help',icon:'book',color:'#286594',action:'Find help'},
  resources:{sectorId:'education',name:'Scholarship',description:'Apply here',url:'https://example.gov.in'},
  'helpline-sections':{title:'Support'},
  helplines:{sectionId:'support',name:'Help',description:'Contact support',number:'112'},
 };
 const ids=new Set();
 for(const [type,record] of Object.entries(records)){
  const created=await request(app).post(`/api/admin/${type}`).auth(key,{type:'bearer'}).send(record);
  assert.equal(created.status,201);
  assert.match(created.body.data.id,/^[a-z0-9][a-z0-9-]{0,63}$/);
  ids.add(created.body.data.id);
  const updated=await request(app).put(`/api/admin/${type}/${created.body.data.id}`).auth(key,{type:'bearer'}).send(record);
  assert.equal(updated.status,200);assert.equal(updated.body.data.id,created.body.data.id);
 }
 assert.equal(ids.size,5);assert.equal(calls.length,10);
});
function setup(overrides={}){const calls=[];const repository={ping:async()=>{},catalog:async()=>({groups:[],sectors:[],helplineSections:[],stats:{groups:0,sectors:0,resources:0}}),resources:async()=>[],write:async(...args)=>{calls.push(args);return true;},remove:async()=>true,...overrides};return {app:createApp({repository,adminKey:key}),calls};}
test('public catalog and health work without admin authentication',async()=>{const {app}=setup();assert.equal((await request(app).get('/api/catalog')).status,200);assert.equal((await request(app).get('/api/health')).body.database,'connected');});
test('writes reject unauthenticated callers without touching repository',async()=>{const {app,calls}=setup();assert.equal((await request(app).post('/api/admin/groups').send({})).status,401);assert.equal(calls.length,0);});
test('valid writes and unknown fields are validated',async()=>{const {app,calls}=setup();const record={id:'students',name:'Students',description:'Education',icon:'book'};assert.equal((await request(app).post('/api/admin/groups').auth(key,{type:'bearer'}).send(record)).status,201);assert.equal(calls[0][1].sortOrder,0);assert.equal((await request(app).post('/api/admin/groups').auth(key,{type:'bearer'}).send({...record,unexpected:true})).status,400);});
test('unsafe URLs and impossible verification dates are rejected',async()=>{const {app}=setup();const record={id:'test',sectorId:'education',name:'Test',description:'Description',url:'javascript:alert(1)'};assert.equal((await request(app).post('/api/admin/resources').auth(key,{type:'bearer'}).send(record)).status,400);assert.equal((await request(app).post('/api/admin/resources').auth(key,{type:'bearer'}).send({...record,url:'https://example.gov.in',lastVerified:'2026-02-31'})).status,400);});
test('missing records return 404',async()=>{const {app}=setup({remove:async()=>false,write:async()=>false});assert.equal((await request(app).delete('/api/admin/groups/missing').auth(key,{type:'bearer'})).status,404);assert.equal((await request(app).put('/api/admin/groups/missing').auth(key,{type:'bearer'}).send({name:'Test',description:'Test',icon:'book'})).status,404);});
test('database errors are sanitized and health signals outage',async()=>{const failure=async()=>{throw Object.assign(new Error('private password detail'),{code:'ECONNREFUSED'});};const {app}=setup({catalog:failure,ping:failure});const response=await request(app).get('/api/catalog');assert.equal(response.status,503);assert.ok(!JSON.stringify(response.body).includes('password'));assert.equal((await request(app).get('/api/health')).status,503);});
