import {createRepository} from './repository.js';
export async function adminContent(pool){
 const catalog=await createRepository(pool).catalog();
 const [rows]=await pool.execute('SELECT id,sector_id AS sectorId,name,description,eligibility,documents,url,source_url AS sourceUrl,last_verified AS lastVerified,sort_order AS sortOrder FROM resources ORDER BY sort_order,id');
 return {groups:catalog.groups,sectors:catalog.sectors.map(({count,...sector})=>sector),resources:rows.map(r=>({...r,documents:typeof r.documents==='string'?JSON.parse(r.documents):r.documents})),'helpline-sections':catalog.helplineSections.map(({items,...section})=>section),helplines:catalog.helplineSections.flatMap(s=>s.items)};
}
