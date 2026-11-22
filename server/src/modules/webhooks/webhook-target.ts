import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
export function isPublicAddress(value:string):boolean {
 const ip=value.toLowerCase().replace(/^\[|\]$/g,'');
 if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a>=224||a===198&&(b===18||b===19));}
 if(isIP(ip)===6)return !ip.startsWith('::')&&!ip.startsWith('fc')&&!ip.startsWith('fd')&&!ip.startsWith('fe8')&&!ip.startsWith('fe9')&&!ip.startsWith('fea')&&!ip.startsWith('feb')&&!ip.startsWith('ff');
 return false;
}
export async function assertPublicWebhookTarget(target:string,resolve=lookup) {
 const url=new URL(target);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hostname==='localhost')throw new Error('Invalid webhook URL');
 const hostname=url.hostname.replace(/^\[|\]$/g,'');
 const addresses=isIP(hostname)?[{address:hostname}]:await resolve(hostname,{all:true});
 if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw new Error('Webhook target must resolve to a public address');
}
