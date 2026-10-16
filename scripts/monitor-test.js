import {runMonitor} from '../monitor/pipeline.js';

const result=await runMonitor({triggerType:'test',days:3});
console.log(JSON.stringify(result,null,2));
if(result.status==='failed'||result.errors>0)process.exitCode=1;
