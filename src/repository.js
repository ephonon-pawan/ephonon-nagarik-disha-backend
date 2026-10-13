export function createRepository(pool) {
 const query = async (sql, params=[]) => (await pool.execute(sql,params))[0];
 async function catalog() {
  const [groups,sectors,relations,resources,sections,helplines] = await Promise.all([
   query('SELECT id,name,description,icon,sort_order AS sortOrder FROM citizen_groups ORDER BY sort_order,id'),
   query('SELECT id,name,description,icon,color,action,keywords,sort_order AS sortOrder FROM sectors ORDER BY sort_order,id'),
   query('SELECT sector_id,group_id FROM sector_groups'), query('SELECT sector_id,COUNT(*) AS total FROM resources GROUP BY sector_id'),
   query('SELECT id,title,sort_order AS sortOrder FROM helpline_sections ORDER BY sort_order,id'),
   query('SELECT id,section_id AS sectionId,name,description,number,region,source_url AS sourceUrl,last_verified AS lastVerified,emergency_label AS emergencyLabel,emergency_order AS emergencyOrder,sort_order AS sortOrder FROM helplines ORDER BY sort_order,id'),
  ]);
  const counts = new Map(resources.map(row => [row.sector_id, Number(row.total)]));
  return {groups,sectors:sectors.map(s => ({...s,groups:relations.filter(r => r.sector_id === s.id).map(r => r.group_id),count:s.id === 'helplines' ? `${helplines.length} NUMBERS` : `${counts.get(s.id) || 0} LINKS`})),helplineSections:sections.map(s => ({...s,items:helplines.filter(h => h.sectionId === s.id)})),emergencyHelplines:helplines.filter(h => h.emergencyOrder !== null).sort((a,b) => a.emergencyOrder-b.emergencyOrder),stats:{sectors:sectors.length,groups:groups.length,resources:resources.reduce((sum,r) => sum+Number(r.total),0)}};
 }
 async function resources(sectorId) {
  const rows = await query('SELECT id,sector_id AS sectorId,name,description,eligibility,documents,url,source_url AS sourceUrl,last_verified AS lastVerified,sort_order AS sortOrder FROM resources WHERE sector_id=? ORDER BY sort_order,id',[sectorId]);
  return rows.map(r => ({...r,documents:typeof r.documents === 'string' ? JSON.parse(r.documents) : r.documents}));
 }
 const definitions = {
  groups:['citizen_groups',{id:'id',name:'name',description:'description',icon:'icon',sortOrder:'sort_order'}],
  sectors:['sectors',{id:'id',name:'name',description:'description',icon:'icon',color:'color',action:'action',keywords:'keywords',sortOrder:'sort_order'}],
  resources:['resources',{id:'id',sectorId:'sector_id',name:'name',description:'description',eligibility:'eligibility',documents:'documents',url:'url',sourceUrl:'source_url',lastVerified:'last_verified',sortOrder:'sort_order'}],
  'helpline-sections':['helpline_sections',{id:'id',title:'title',sortOrder:'sort_order'}],
  helplines:['helplines',{id:'id',sectionId:'section_id',name:'name',description:'description',number:'number',region:'region',sourceUrl:'source_url',lastVerified:'last_verified',emergencyLabel:'emergency_label',emergencyOrder:'emergency_order',sortOrder:'sort_order'}],
 };
 async function write(type,record,update=false) {
  const [table,mapping]=definitions[type]; const entries=Object.entries(mapping).filter(([key])=>key!=='id');
  const values=entries.map(([key])=>key==='documents'?JSON.stringify(record[key]):record[key]);
  const db=await pool.getConnection();
  try {
   await db.beginTransaction();
   if(update){
    const [rows]=await db.execute(`SELECT id FROM ${table} WHERE id=? FOR UPDATE`,[record.id]);
    if(!rows.length){await db.rollback();return false;}
    await db.execute(`UPDATE ${table} SET ${entries.map(([,column])=>`${column}=?`).join(',')} WHERE id=?`,[...values,record.id]);
   } else await db.execute(`INSERT INTO ${table} (id,${entries.map(([,column])=>column).join(',')}) VALUES (${[record.id,...values].map(()=>'?').join(',')})`,[record.id,...values]);
   if(type==='sectors') {
    await db.execute('DELETE FROM sector_groups WHERE sector_id=?',[record.id]);
    for(const group of new Set(record.groups)) await db.execute('INSERT INTO sector_groups (sector_id,group_id) VALUES (?,?)',[record.id,group]);
   }
   await db.commit();return true;
  }catch(error){await db.rollback();throw error;}finally{db.release();}
 }
 async function remove(type,id){const [table]=definitions[type];const result=await query(`DELETE FROM ${table} WHERE id=?`,[id]);return result.affectedRows>0;}
 return {catalog,resources,write,remove,ping:()=>query('SELECT 1')};
}
