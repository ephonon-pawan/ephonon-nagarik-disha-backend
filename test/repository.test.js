import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRepository} from '../src/repository.js';
test('catalog computes real counts and organizes relations and emergency entries',async()=>{
 const pool={execute:async(sql)=>{
  if(sql.includes('FROM citizen_groups'))return [[{id:'children'}]];
  if(sql.includes('FROM sectors'))return [[{id:'education'},{id:'helplines'}]];
  if(sql.includes('FROM sector_groups'))return [[{sector_id:'education',group_id:'children'}]];
  if(sql.includes('FROM resources'))return [[{sector_id:'education',total:2}]];
  if(sql.includes('FROM helpline_sections'))return [[{id:'emergency',title:'Emergency'}]];
  if(sql.includes('FROM helplines'))return [[{id:'police',sectionId:'emergency',emergencyOrder:null},{id:'all',sectionId:'emergency',emergencyOrder:0}]];
  throw new Error('Unexpected query');
 }};
 const data=await createRepository(pool).catalog();
 assert.equal(data.sectors[0].count,'2 LINKS');assert.equal(data.sectors[1].count,'2 NUMBERS');assert.deepEqual(data.sectors[0].groups,['children']);assert.equal(data.helplineSections[0].items.length,2);assert.equal(data.emergencyHelplines.length,1);assert.deepEqual(data.stats,{sectors:2,groups:1,resources:2});
});
test('sector update rolls back if a group relation cannot be written',async()=>{
 const calls=[];const connection={beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release'),execute:async(sql)=>{if(sql.startsWith('SELECT'))return [[{id:'education'}]];if(sql.startsWith('INSERT INTO sector_groups'))throw new Error('Unknown group');return [{affectedRows:1}];}};
 const repository=createRepository({getConnection:async()=>connection});
 await assert.rejects(repository.write('sectors',{id:'education',name:'Education',description:'Help',icon:'book',color:'#123456',action:'Explore',keywords:'',sortOrder:0,groups:['missing']},true));
 assert.deepEqual(calls,['begin','rollback','release']);
});
test('resource JSON documents are decoded and filter uses bound parameters',async()=>{
 const repository=createRepository({execute:async(sql,params)=>{assert.deepEqual(params,["education' OR 1=1"]);assert.ok(sql.includes('WHERE sector_id=?'));return [[{id:'test',documents:'["ID proof"]'}]];}});
 assert.deepEqual((await repository.resources("education' OR 1=1"))[0].documents,['ID proof']);
});
