// Run from apps/api: node --import tsx ../../tests/portal-integration.mjs
// Every write is rolled back. No email delivery, no persistent test customers.
import assert from "node:assert/strict";
import {once} from "node:events";
import {randomUUID} from "node:crypto";
import {db} from "../apps/api/src/db.ts";
import {signAdminToken,decryptSecret} from "../apps/api/src/security.ts";
import {createTrackingAccess} from "../apps/api/src/client-security.ts";
process.env.MAIL_DELIVERY_DISABLED="true";
const client=await db.connect(),query=client.query.bind(client),release=client.release.bind(client);
const originalQuery=db.query,originalConnect=db.connect;
let server;
try{
  await query("BEGIN");
  await query("SET LOCAL statement_timeout='10s'");
  const tx=async(sql,values)=>{
    if(sql==="BEGIN")return query("SAVEPOINT portal_route");
    if(sql==="COMMIT")return query("RELEASE SAVEPOINT portal_route");
    if(sql==="ROLLBACK"){await query("ROLLBACK TO SAVEPOINT portal_route");return query("RELEASE SAVEPOINT portal_route");}
    return query(sql,values);
  };
  db.query=tx;db.connect=async()=>({query:tx,release(){}});
  const {app}=await import("../apps/api/src/app.ts");
  server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${server.address().port}`;
  const admin=signAdminToken({sub:randomUUID(),email:"test@example.invalid",role:"admin"});
  async function request(path,{method="GET",body,token,auth=false}={}){
    const headers={...(body instanceof FormData?{}:{"Content-Type":"application/json"}),...(auth?{Authorization:`Bearer ${admin}`}:{}),...(token?{"X-Tracking-Token":token}:{})};
    return fetch(base+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  }
  assert.equal((await request("/api/admin/experience")).status,401);
  assert.equal((await request("/api/admin/consultations")).status,401);
  assert.equal((await request("/api/admin/login",{method:"POST",body:{email:"invalid@example.invalid",password:"not-an-admin"}})).status,401);
  const old=await request("/api/admin/experience",{auth:true}).then(r=>r.json());
  const settings={...old,mail_provider:"brevo",brevoApiKey:"xkeysib-test-only",brevo_sender_email:"test@example.invalid",contact_email:"test@example.invalid",public_site_url:"http://localhost:5173",virtual_enabled:true,virtual_fee:25,payment_instructions:"DATOS DE PRUEBA. No realices transferencias.",payments_test_mode:true};
  assert.equal((await request("/api/admin/experience",{auth:true,method:"PUT",body:settings})).status,200);
  await query("UPDATE site_settings SET notify_client=true,notify_attorney=true WHERE id=1");
  const privateSettings=await request("/api/admin/settings",{auth:true}).then(r=>r.json());
  assert.ok(!("brevo_api_key_encrypted" in privateSettings));
  const pub=await request("/api/public/settings").then(r=>r.json());
  assert.ok(!JSON.stringify(pub).includes("xkeysib"));
  assert.equal(pub.payments_test_mode,true);
  assert.equal((await request("/api/admin/experience/test-mail",{auth:true,method:"POST",body:{recipient:"test@example.invalid"}})).status,400);
  // Consultation creation and token privacy.
  const create=await request("/api/public/consultations",{method:"POST",body:{clientName:"Prueba transaccional",clientEmail:"client@example.invalid",clientPhone:"0999999999",practiceArea:"Prueba legal",reason:"Contexto privado para prueba sin envío.",privacyAccepted:true,website:""}});
  assert.equal(create.status,201);const consultation=await create.json();
  assert.match(consultation.trackingToken,/^[a-f0-9]{64}$/);
  assert.equal((await request("/api/public/tracking")).status,401);
  assert.equal((await request("/api/public/tracking",{token:"a".repeat(64)})).status,401);
  const trackResponse=await request("/api/public/tracking",{token:consultation.trackingToken});
  assert.equal(trackResponse.headers.get("cache-control"),"no-store");
  const tracked=await trackResponse.json();assert.equal(tracked.status,"new");assert.ok(!("reason" in tracked));
  const record=(await query("SELECT * FROM consultations WHERE reference_code=$1",[consultation.reference])).rows[0];
  assert.equal((await request(`/api/admin/consultations/${record.id}`,{auth:true,method:"PATCH",body:{status:"answered",clientNote:"Respuesta de prueba privada."}})).status,200);
  const next=await request("/api/public/tracking",{token:consultation.trackingToken}).then(r=>r.json());assert.equal(next.client_note,"Respuesta de prueba privada.");
  const jobs=(await query("SELECT * FROM notification_jobs WHERE consultation_id=$1",[record.id])).rows;
  assert.equal(jobs.length,4);assert.ok(jobs.every(j=>j.status==="pending"));
  assert.ok(decryptSecret(jobs[0].payload_encrypted).includes("/seguimiento#token=")||decryptSecret(jobs[0].payload_encrypted).includes("/admin"));
  assert.ok(jobs.every(j=>!decryptSecret(j.payload_encrypted).includes("Contexto privado")));
  // Build an isolated virtual appointment to exercise private receipt workflow.
  const access=createTrackingAccess();const id=randomUUID();
  await query("INSERT INTO appointments(id,reference_code,client_name,client_email,client_phone,starts_at,duration_minutes,practice_area,reason,modality,payment_status,payment_amount,payment_instructions,payment_test_mode,tracking_hash,tracking_token_encrypted,tracking_expires_at,privacy_accepted_at) VALUES($1,$2,'Prueba','client@example.invalid','0999999999',NOW()+INTERVAL '50 days',60,'Prueba','Prueba privada','virtual','pending',25,'No transferir: prueba',true,$3,$4,NOW()+INTERVAL '90 days',NOW())",[id,"TEST-"+randomUUID(),access.hash,access.encrypted]);
  assert.equal((await request(`/api/admin/appointments/${id}/client-update`,{auth:true,method:"PATCH",body:{paymentStatus:"approved",clientNote:"",meetingUrl:""}})).status,409);
  const invalidFile=new FormData();invalidFile.append("file",new Blob(["not a pdf"],{type:"application/pdf"}),"test.pdf");
  assert.equal((await request("/api/public/tracking/receipt",{method:"POST",token:access.token,body:invalidFile})).status,400);
  const file=new FormData();file.append("file",new Blob(["%PDF-1.4\ntransactional test receipt\n%%EOF"],{type:"application/pdf"}),"test.pdf");
  const uploaded=await request("/api/public/tracking/receipt",{method:"POST",token:access.token,body:file});assert.equal(uploaded.status,201);
  const receipt=(await query("SELECT id FROM payment_receipts WHERE appointment_id=$1",[id])).rows[0];
  assert.equal((await request(`/api/admin/receipts/${receipt.id}`)).status,401);
  const download=await request(`/api/admin/receipts/${receipt.id}`,{auth:true});assert.equal(download.status,200);assert.match(download.headers.get("content-disposition"),/attachment/);
  const update={paymentStatus:"approved",status:"confirmed",internalNotes:"INTERNAL SECRET",clientNote:"Tu reunión está confirmada.",meetingUrl:"https://meet.google.com/test-only"};
  assert.equal((await request(`/api/admin/appointments/${id}/client-update`,{auth:true,method:"PATCH",body:update})).status,200);
  const status=await request("/api/public/tracking",{token:access.token}).then(r=>r.json());assert.equal(status.payment_status,"approved");assert.equal(status.meeting_url,update.meetingUrl);assert.ok(!JSON.stringify(status).includes("INTERNAL"));
  const appointmentJobs=(await query("SELECT count(*)::int n FROM notification_jobs WHERE appointment_id=$1",[id])).rows[0].n;
  await request(`/api/admin/appointments/${id}/client-update`,{auth:true,method:"PATCH",body:update});
  assert.equal((await query("SELECT count(*)::int n FROM notification_jobs WHERE appointment_id=$1",[id])).rows[0].n,appointmentJobs,"No-op must not send duplicate messages");
  await query("UPDATE appointments SET tracking_expires_at=NOW()-INTERVAL '1 day' WHERE id=$1",[id]);
  assert.equal((await request("/api/public/tracking",{token:access.token})).status,401);
  const recovery=await request("/api/public/tracking/recover",{method:"POST",body:{email:"client@example.invalid",reference:(await query("SELECT reference_code FROM appointments WHERE id=$1",[id])).rows[0].reference_code}});assert.equal(recovery.status,200);
  // Gallery CRUD preserves media order; drafts are never public.
  const post={title:"Prueba editorial",kind:"case",platform:"instagram",externalUrl:"https://www.instagram.com/p/DdE5CafERt1/",status:"draft",gallery:[{url:"/images/elvis-burgundy.png",type:"image",alt:"Primera"},{url:"/images/elvis-profile-new.png",type:"image",alt:"Segunda"}]};
  assert.equal((await request("/api/admin/publications",{auth:true,method:"POST",body:{...post,title:"Enlace inseguro",externalUrl:"javascript:alert(1)"}})).status,400,"Las URLs de la vitrina no deben aceptar esquemas ejecutables");
  const posted=await request("/api/admin/publications",{auth:true,method:"POST",body:post});assert.equal(posted.status,201);const publication=await posted.json();assert.equal(publication.gallery.length,2);
  assert.equal((await request("/api/public/publications/"+publication.slug)).status,404);
  assert.equal((await request("/api/admin/publications/"+publication.id,{auth:true,method:"PUT",body:{...post,status:"published",gallery:[...post.gallery].reverse()}})).status,200);
  const published=await request("/api/public/publications/"+publication.slug).then(r=>r.json());assert.equal(published.gallery[0].alt,"Segunda");
  console.log("PASS: admin auth, settings secrecy, consultations, private tracking, encrypted outbox, private receipts, payment review, meeting visibility, expiry/recovery and gallery CRUD.");
}finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  db.query=originalQuery;db.connect=originalConnect;
  try{await query("ROLLBACK");console.log("PASS: all integration test writes rolled back; zero emails sent.");}finally{release();await db.end();}
}
