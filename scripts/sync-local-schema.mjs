import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),source=new URL('server/src/database/migrations/',root),destination=new URL('supabase/migrations/',root);
mkdirSync(destination,{recursive:true});
const files=readdirSync(source).filter(name=>name.endsWith('.sql')).sort();
const sql=files.map(name=>`-- Source: server/src/database/migrations/${name}\n${readFileSync(new URL(name,source),'utf8').replace(/^\uFEFF/,'')}`).join('\n\n');
writeFileSync(new URL('20261122165322_local_container_bootstrap.sql',destination),sql);
console.log(`Prepared ${files.length} migrations for local Supabase containers at ${fileURLToPath(destination)}`);
