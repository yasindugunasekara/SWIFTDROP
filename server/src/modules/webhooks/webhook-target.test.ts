import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicWebhookTarget,isPublicAddress} from './webhook-target.js';
test('webhook targets reject local/private IPs, private DNS answers and URL credentials',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.2','169.254.169.254','::1','::ffff:127.0.0.1','fd00::1'])assert.equal(isPublicAddress(ip),false);
 await assert.rejects(assertPublicWebhookTarget('http://127.0.0.1/hook'));
 await assert.rejects(assertPublicWebhookTarget('http://user:password@example.com/hook'));
 await assert.rejects(assertPublicWebhookTarget('https://merchant.example/hook',(async()=>[{address:'10.0.0.1',family:4}]) as any));
 await assertPublicWebhookTarget('https://merchant.example/hook',(async()=>[{address:'8.8.8.8',family:4}]) as any);
});
