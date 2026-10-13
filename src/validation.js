import { z } from 'zod';
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const name = z.string().trim().min(1).max(160);
const text = z.string().trim().min(1).max(10000);
const url = z.string().max(2048).url().refine(v => /^https?:\/\//.test(v), 'Only HTTP(S) URLs are supported');
const verified = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return !isNaN(d) && d.toISOString().slice(0,10) === v; }, 'Invalid date').nullable().default(null);
const order = z.number().int().min(0).max(100000).default(0);
export const schemas = {
 groups: z.object({id,name,description:text,icon:z.string().min(1).max(64),sortOrder:order}).strict(),
 sectors: z.object({id,name,description:text,icon:z.string().min(1).max(64),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),action:name,keywords:z.string().max(10000).default(''),groups:z.array(id).max(100).default([]),sortOrder:order}).strict(),
 resources: z.object({id,sectorId:id,name,description:text,eligibility:z.string().max(10000).default(''),documents:z.array(z.string().min(1).max(500)).max(50).default([]),url,sourceUrl:url.nullable().default(null),lastVerified:verified,sortOrder:order}).strict(),
 'helpline-sections': z.object({id,title:name,sortOrder:order}).strict(),
 helplines: z.object({id,sectionId:id,name,description:text,number:z.string().regex(/^[0-9+][0-9 -]{1,31}$/),region:name.default('India'),sourceUrl:url.nullable().default(null),lastVerified:verified,emergencyLabel:z.string().min(1).max(100).nullable().default(null),emergencyOrder:order.nullable().default(null),sortOrder:order}).strict(),
};
