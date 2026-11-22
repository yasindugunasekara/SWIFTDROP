import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const reportDirectory=fileURLToPath(new URL('../../docs/test-reports/',import.meta.url));
mkdirSync(reportDirectory,{recursive:true});
const tests=[
 'src/modules/operations/operations.integration.test.ts','src/modules/auth/auth.test.ts','src/modules/admin/admin.test.ts',
 'src/modules/booking/booking.test.ts','src/modules/notifications/notification.events.test.ts',
 'src/modules/notifications/notification.database.test.ts','src/modules/notifications/notification.test.ts',
 'src/modules/notifications/notification.publisher.test.ts','src/workers/notification-consumer.test.ts',
 'src/workers/notification-consumer.lifecycle.test.ts','src/modules/tracking/tracking.socket.test.ts','src/modules/ai/assistant.test.ts',
 'src/modules/webhooks/webhook-target.test.ts'
];
const includes=['src/modules/operations/**','src/modules/booking/**','src/modules/courier/courier.database.ts',
 'src/modules/dispatch/dispatch.database.ts','src/modules/webhooks/webhook.database.ts','src/modules/webhooks/webhook-target.ts','src/workers/event-outbox.ts','src/modules/ai/assistant.ts'];
const args=['--import','tsx','--test','--test-reporter=tap','--experimental-test-coverage','--test-coverage-exclude=**/*.test.ts',
 ...includes.map(path=>`--test-coverage-include=${path}`),...tests];
const startedAt=new Date().toISOString(),started=Date.now();
const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe'],env:{...process.env,FORCE_COLOR:'0'}});
let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('close',code=>{
 const summary={startedAt,node:process.version,durationMs:Date.now()-started,exitCode:code,command:'npm --prefix server run test:audit',
  tests:Number(output.match(/^# tests (\d+)/m)?.[1]??0),passed:Number(output.match(/^# pass (\d+)/m)?.[1]??0),
  failed:Number(output.match(/^# fail (\d+)/m)?.[1]??0),skipped:Number(output.match(/^# skipped (\d+)/m)?.[1]??0),
  suites:tests,coverageScope:includes,coverageReport:output.slice(output.indexOf('# start of coverage report'))};
 writeFileSync(reportDirectory+'/backend-audit.txt',output);
 writeFileSync(reportDirectory+'/backend-audit.json',JSON.stringify(summary,null,2)+'\n');
 console.log(output.split(/\r?\n/).slice(-65).join('\n'));
 console.log(`Saved test report: docs/test-reports/backend-audit.txt (${summary.passed}/${summary.tests} passed)`);
 process.exitCode=code??1;
});
