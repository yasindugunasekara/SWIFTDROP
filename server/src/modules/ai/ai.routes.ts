import {Router} from 'express';
import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import {authenticateToken} from '../../middleware/auth.js';
import {requireRoles} from '../../middleware/rbac.js';
import {databaseDispatchService} from '../dispatch/dispatch.database.js';
import {answerDeliveryQuestion} from './assistant.js';
const router=Router();
router.use(authenticateToken);
router.post('/chat',rateLimit({windowMs:60000,limit:10}),async(req,res)=>{
 const parsed=z.object({question:z.string().trim().min(2).max(1000)}).strict().safeParse(req.body);
 if(!parsed.success){res.status(400).json({error:'Enter a question between 2 and 1000 characters.'});return;}
 try{res.json({answer:await answerDeliveryQuestion(parsed.data.question)});}catch{res.status(503).json({error:'The delivery assistant is unavailable. Use tracking or fee quote directly.'});}
});
router.post('/smart-dispatch-recommendation',requireRoles(['DISPATCHER','ADMIN']),async(req,res)=>{
 const input=z.object({parcelId:z.string().uuid()}).safeParse(req.body);if(!input.success){res.status(400).json({error:'A parcel ID is required.'});return;}
 try{const result=await databaseDispatchService.getSmartDispatchRecommendation(input.data.parcelId);res.json({success:true,...result,method:'workload heuristic'});}catch{res.status(503).json({error:'Dispatch suggestions are unavailable.'});}
});
router.post('/validate-address',(_req,res)=>{res.status(501).json({error:'Address verification is not configured. Confirm the address with the recipient.'});});
router.post('/verify-delivery-proof',(_req,res)=>{res.status(501).json({error:'Automated proof verification is not configured. Staff must review the uploaded photo.'});});
export default router;
