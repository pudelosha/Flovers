import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
const languages=['en','pl','de','it','fr','es','pt','ar','hi','zh','ja','ko','id','ru','tr'];
function strings(value) {
 if(typeof value==='string')return [value];
 return value && typeof value==='object' ? Object.values(value).flatMap(strings) : [];
}
async function files(directory) {
 const entries=await readdir(directory,{withFileTypes:true});
 const output=[];
 for(const entry of entries) {
  const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
  if(entry.isDirectory())output.push(...await files(url));
  else if(entry.name.endsWith('.json'))output.push(url);
 }
 return output;
}
for(const language of languages) test(`${language}: website and email translations preserve letters`,async()=>{
 for(const root of ['../src/locales/','../../backend/i18n/locales/']) {
  for(const file of await files(new URL(root+language+'/',import.meta.url))) {
   const data=JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
   for(const text of strings(data))assert.doesNotMatch(text,/\?{2,}|[\p{L}\p{N}]\?[\p{L}\p{N}]|[\uFFFD\u0080-\u009F]/u,file.pathname);
   if(file.pathname.endsWith('/contacts.join.json'))for(const text of strings(data))assert.ok(!text.includes('?'),`Damaged invitation: ${file.pathname}`);
   if(file.pathname.endsWith('/docs_contacts.json'))for(const text of strings(data.docs_contacts.sections[1]))assert.ok(!text.includes('?'),`Damaged invitation instructions: ${file.pathname}`);
  }
 }
});
