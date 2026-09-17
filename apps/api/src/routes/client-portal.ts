import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "node:crypto";
import { z } from "zod";
import { db, withTransaction } from "../db.js";
import { adminRecord, createTrackingAccess, hashTrackingToken, receiptMime } from "../client-security.js";
import { enqueueRecordNotifications, trackingLink } from "../notifications.js";
import { requireAdmin } from "../security.js";
import { makeReference } from "../utils.js";
import { isHttpsUrl } from "../settings-schema.js";

export const clientPortalRouter = Router();
export const clientAdminRouter = Router();
const limiter = (limit: number, minutes: number) => rateLimit({ windowMs:minutes*60000,limit,standardHeaders:"draft-8",legacyHeaders:false,message:{error:"Demasiados intentos. Espera unos minutos."} });
const creationLimit = limiter(6,15);
const receiptUpload = multer({ storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0} }).single("file");

clientPortalRouter.post("/consultations",creationLimit,async(req,res)=>{
  const parsed=z.object({clientName:z.string().trim().min(3).max(120),clientEmail:z.email().max(180),clientPhone:z.string().trim().min(7).max(30),practiceArea:z.string().trim().min(2).max(100),reason:z.string().trim().min(10).max(1500),privacyAccepted:z.literal(true),website:z.string().max(0).optional().default("")}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:"Revisa los datos y acepta el aviso de privacidad"});
  const data=parsed.data,access=createTrackingAccess(),reference="CON-"+makeReference().slice(4);
  const result=await withTransaction(async client=>{
    const {rows}=await client.query("INSERT INTO consultations(reference_code,client_name,client_email,client_phone,practice_area,reason,tracking_hash,tracking_token_encrypted) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[reference,data.clientName,data.clientEmail.toLowerCase(),data.clientPhone,data.practiceArea,data.reason,access.hash,access.encrypted]);
    await enqueueRecordNotifications(client,"consultation",rows[0],"created","Recibimos tu consulta");
    return rows[0];
  });
  const settings=(await db.query("SELECT public_site_url FROM site_settings WHERE id=1")).rows[0];
  res.status(201).json({reference:result.reference_code,trackingToken:access.token,trackingUrl:trackingLink(settings,access.token),notification:"queued"});
});

async function authorizeTracking(req:Request,res:Response,next:NextFunction){
  res.set({"Cache-Control":"no-store","Referrer-Policy":"no-referrer"});
  const token=req.get("X-Tracking-Token")??"";
  if(!/^[a-f0-9]{64}$/.test(token))return res.status(401).json({error:"Abre el enlace privado enviado a tu correo"});
  const hash=hashTrackingToken(token);
  const appointment=(await db.query("SELECT * FROM appointments WHERE tracking_hash=$1 AND tracking_expires_at>NOW()",[hash])).rows[0];
  const consultation=appointment?null:(await db.query("SELECT * FROM consultations WHERE tracking_hash=$1 AND tracking_expires_at>NOW()",[hash])).rows[0];
  if(!appointment&&!consultation)return res.status(401).json({error:"El enlace no es válido o caducó. Solicita uno nuevo con tu correo y referencia."});
  res.locals.record=appointment??consultation;res.locals.kind=appointment?"appointment":"consultation";
  next();
}
clientPortalRouter.get("/tracking",limiter(60,15),authorizeTracking,async(_req,res)=>{
  const r=res.locals.record;
  const receipts=res.locals.kind==="appointment"?(await db.query("SELECT id,mime_type,created_at FROM payment_receipts WHERE appointment_id=$1 ORDER BY created_at DESC",[r.id])).rows:[];
  res.json({kind:res.locals.kind,reference_code:r.reference_code,client_name:r.client_name,practice_area:r.practice_area,status:r.status,client_note:r.client_note,starts_at:r.starts_at,modality:r.modality,payment_status:r.payment_status,payment_amount:r.payment_amount,payment_instructions:r.payment_instructions,payment_test_mode:r.payment_test_mode,meeting_url:r.payment_status==="approved"&&r.status==="confirmed"?r.meeting_url:"",created_at:r.created_at,updated_at:r.updated_at,receipts});
});
clientPortalRouter.post("/tracking/receipt",limiter(6,60),authorizeTracking,(req,res,next)=>{
  receiptUpload(req,res,error=>error?res.status(400).json({error:"Adjunta un solo JPG, PNG o PDF de hasta 5 MB"}):next());
},async(req,res)=>{
  if(res.locals.kind!=="appointment"||!req.file)return res.status(400).json({error:"Selecciona el comprobante de tu cita virtual"});
  const mime=receiptMime(req.file.buffer);
  if(!mime||req.file.buffer.length<8)return res.status(400).json({error:"El archivo debe ser un JPG, PNG o PDF válido"});
  const result=await withTransaction(async client=>{
    const record=(await client.query("SELECT * FROM appointments WHERE id=$1 FOR UPDATE",[res.locals.record.id])).rows[0];
    if(record.modality!=="virtual"||!["scheduled","confirmed"].includes(record.status)||!["pending","rejected"].includes(record.payment_status))return null;
    const count=(await client.query("SELECT COUNT(*)::int AS total FROM payment_receipts WHERE appointment_id=$1",[record.id])).rows[0].total;
    if(count>=3)return null;
    await client.query("INSERT INTO payment_receipts(appointment_id,mime_type,file_data) VALUES($1,$2,$3)",[record.id,mime,req.file!.buffer]);
    const updated=(await client.query("UPDATE appointments SET payment_status='submitted',updated_at=NOW() WHERE id=$1 RETURNING *",[record.id])).rows[0];
    await enqueueRecordNotifications(client,"appointment",updated,"receipt_"+crypto.randomUUID(),"Comprobante recibido para revisión");
    return updated;
  });
  if(!result)return res.status(409).json({error:"Esta cita no admite otro comprobante. Revisa su estado o contacta al despacho."});
  res.status(201).json({ok:true,paymentStatus:"submitted",notification:"queued"});
});
clientPortalRouter.post("/tracking/recover",limiter(3,60),async(req,res)=>{
  const parsed=z.object({email:z.email(),reference:z.string().trim().min(5).max(60)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:"Ingresa un correo y una referencia válidos"});
  const {email,reference}=parsed.data;
  await withTransaction(async client=>{
    for(const table of ["appointments","consultations"] as const){
      const record=(await client.query("SELECT * FROM "+table+" WHERE LOWER(client_email)=$1 AND reference_code=$2 FOR UPDATE",[email.toLowerCase(),reference])).rows[0];
      if(!record)continue;
      // Renew expired/legacy access; old valid links remain usable.
      if(!record.tracking_token_encrypted||new Date(record.tracking_expires_at).getTime()<Date.now()){
        const access=createTrackingAccess();
        Object.assign(record,(await client.query("UPDATE "+table+" SET tracking_hash=$2,tracking_token_encrypted=$3,tracking_expires_at=NOW()+INTERVAL '90 days' WHERE id=$1 RETURNING *",[record.id,access.hash,access.encrypted])).rows[0]);
      }
      await enqueueRecordNotifications(client,table==="appointments"?"appointment":"consultation",record,"recover_"+Math.floor(Date.now()/600000),"Tu enlace de seguimiento");
    }
  });
  res.json({ok:true,message:"Si el correo y la referencia coinciden, recibirás el enlace de seguimiento."});
});

clientAdminRouter.use(requireAdmin);
clientAdminRouter.get("/consultations",async(_req,res)=>res.json((await db.query("SELECT * FROM consultations ORDER BY created_at DESC LIMIT 300")).rows.map(adminRecord)));
clientAdminRouter.patch("/consultations/:id",async(req,res)=>{
  const parsed=z.object({status:z.enum(["new","in_review","answered","closed"]),clientNote:z.string().trim().max(3000)}).safeParse(req.body);
  if(!parsed.success||!z.uuid().safeParse(req.params.id).success)return res.status(400).json({error:"Actualización inválida"});
  const result=await withTransaction(async client=>{
    const old=(await client.query("SELECT * FROM consultations WHERE id=$1 FOR UPDATE",[req.params.id])).rows[0];if(!old)return null;
    if(old.status===parsed.data.status&&old.client_note===parsed.data.clientNote)return old;
    const row=(await client.query("UPDATE consultations SET status=$2,client_note=$3,updated_at=NOW() WHERE id=$1 RETURNING *",[req.params.id,parsed.data.status,parsed.data.clientNote])).rows[0];
    await enqueueRecordNotifications(client,"consultation",row,"updated_"+crypto.randomUUID(),"Actualización de tu consulta");return row;
  });
  if(!result)return res.status(404).json({error:"Consulta no encontrada"});res.json(adminRecord(result));
});
clientAdminRouter.get("/appointments/:id/receipts",async(req,res)=>{
  if(!z.uuid().safeParse(req.params.id).success)return res.status(400).json({error:"Identificador inválido"});
  res.json((await db.query("SELECT id,mime_type,created_at FROM payment_receipts WHERE appointment_id=$1 ORDER BY created_at DESC",[req.params.id])).rows);
});
clientAdminRouter.get("/receipts/:id",async(req,res)=>{
  if(!z.uuid().safeParse(req.params.id).success)return res.status(400).json({error:"Identificador inválido"});
  const row=(await db.query("SELECT mime_type,file_data FROM payment_receipts WHERE id=$1",[req.params.id])).rows[0];
  if(!row)return res.status(404).json({error:"Comprobante no encontrado"});
  res.set({"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"});
  res.attachment("comprobante."+(row.mime_type==="application/pdf"?"pdf":row.mime_type==="image/png"?"png":"jpg")).type(row.mime_type).send(row.file_data);
});
clientAdminRouter.patch("/appointments/:id/client-update",async(req,res)=>{
  const parsed=z.object({status:z.enum(["scheduled","confirmed","completed","cancelled","no_show"]).optional(),internalNotes:z.string().max(5000).optional(),paymentStatus:z.enum(["pending","approved","rejected"]).optional(),clientNote:z.string().max(3000),meetingUrl:z.string().trim().max(1500).refine(v=>!v||isHttpsUrl(v),"El enlace de reunión debe usar HTTPS")}).safeParse(req.body);
  if(!parsed.success||!z.uuid().safeParse(req.params.id).success)return res.status(400).json({error:"Revisa la actualización y el enlace de reunión"});
  const result=await withTransaction(async client=>{
    const old=(await client.query("SELECT * FROM appointments WHERE id=$1 FOR UPDATE",[req.params.id])).rows[0];if(!old)return null;
    if(parsed.data.paymentStatus&&old.modality!=="virtual")return {error:"Esta cita es presencial"};
    if(parsed.data.paymentStatus==="approved"&&!["submitted","approved"].includes(old.payment_status))return {error:"Revisa primero un comprobante recibido"};
    if(old.payment_status===(parsed.data.paymentStatus??old.payment_status)&&old.client_note===parsed.data.clientNote&&old.meeting_url===parsed.data.meetingUrl&&old.status===(parsed.data.status??old.status)&&old.internal_notes===(parsed.data.internalNotes??old.internal_notes))return old;
    const row=(await client.query("UPDATE appointments SET payment_status=COALESCE($2,payment_status),client_note=$3,meeting_url=$4,status=COALESCE($5,status),internal_notes=COALESCE($6,internal_notes),updated_at=NOW() WHERE id=$1 RETURNING *",[req.params.id,parsed.data.paymentStatus??null,parsed.data.clientNote,parsed.data.meetingUrl,parsed.data.status??null,parsed.data.internalNotes??null])).rows[0];
    await enqueueRecordNotifications(client,"appointment",row,"updated_"+crypto.randomUUID(),"Actualización de tu cita");return row;
  });
  if(!result)return res.status(404).json({error:"Cita no encontrada"});if(result.error)return res.status(409).json(result);res.json(adminRecord(result));
});
