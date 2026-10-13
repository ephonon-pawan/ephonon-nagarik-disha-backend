import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';
const data = JSON.parse(await readFile(new URL('./seed-data.json', import.meta.url), 'utf8'));
const db = await pool.getConnection();
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,64);
try {
 await db.beginTransaction();
 for (const [index, group] of data.groups.entries()) await db.execute('INSERT IGNORE INTO citizen_groups (id,name,description,icon,sort_order) VALUES (?,?,?,?,?)',[group.id,group.name,group.description,group.icon,index]);
 for (const [index, sector] of data.sectors.entries()) {
  await db.execute('INSERT IGNORE INTO sectors (id,name,description,icon,color,action,keywords,sort_order) VALUES (?,?,?,?,?,?,?,?)',[sector.id,sector.name,sector.description,sector.icon,sector.color,sector.action,sector.keywords,index]);
  for (const group of sector.groups) await db.execute('INSERT IGNORE INTO sector_groups (sector_id,group_id) VALUES (?,?)',[sector.id,group]);
 }
 const emergency = {'All-in-one Emergency':['ALL-IN-ONE EMERGENCY',0], 'Child Helpline':['CHILD HELPLINE',1], 'Women’s Helpline':['WOMEN’S HELPLINE',2], Ambulance:['AMBULANCE',3]};
 for (const [index, section] of data.helplineSections.entries()) {
  const sectionId = slug(section.title);
  await db.execute('INSERT IGNORE INTO helpline_sections (id,title,sort_order) VALUES (?,?,?)',[sectionId,section.title,index]);
  for (const [itemIndex, item] of section.items.entries()) {
   const [label, order] = emergency[item.name] || [null,null];
   await db.execute('INSERT IGNORE INTO helplines (id,section_id,name,description,number,emergency_label,emergency_order,sort_order) VALUES (?,?,?,?,?,?,?,?)',[slug(item.name),sectionId,item.name,item.description,item.number,label,order,itemIndex]);
  }
 }
 await db.commit();
 console.log('Reference content seeded. Existing records were preserved; resource links remain empty until verified content is added.');
} catch (error) { await db.rollback(); throw error; } finally { db.release(); await pool.end(); }
