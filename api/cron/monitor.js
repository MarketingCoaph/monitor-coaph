import {runMonitor} from '../../monitor/pipeline.js';

export const config={maxDuration:300};
export default async function handler(req,res){
 const expected=process.env.CRON_SECRET;
 const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'')||req.headers['x-cron-secret'];
 if(!expected||supplied!==expected)return res.status(401).json({success:false,message:'Não autorizado'});
 if(!['GET','POST'].includes(req.method))return res.status(405).json({success:false,message:'Método não permitido'});
 try{return res.status(200).json({success:true,data:await runMonitor({triggerType:req.method==='POST'?'manual':'cron'})})}
 catch(error){return res.status(500).json({success:false,message:error.message})}
}
