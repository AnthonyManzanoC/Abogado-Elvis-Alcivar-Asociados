// Run from apps/api: node --import tsx ../../tests/contact-integration.mjs
// Uses the configured database, but all test writes remain in an outer transaction
// that is ALWAYS rolled back. Never creates appointments or sends notifications.
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { db } from "../apps/api/src/db.ts";
import { signAdminToken } from "../apps/api/src/security.ts";
import { settingsPayload } from "../apps/web/src/lib/admin-settings.ts";

const client = await db.connect();
const query = client.query.bind(client);
const release = client.release.bind(client);
const poolQuery = db.query.bind(db);
const poolConnect = db.connect.bind(db);
let server;
let injectFailure = false;
const fingerprint = async () => {
  const { rows } = await query(`SELECT
    (SELECT md5(jsonb_agg(to_jsonb(s) ORDER BY id)::text) FROM site_settings s) AS settings,
    (SELECT md5(jsonb_agg(to_jsonb(a) ORDER BY id)::text) FROM availability a) AS availability`);
  return rows[0];
};
const before = await fingerprint();
try {
  await query("BEGIN");
  await query("SET LOCAL statement_timeout = '10s'");
  await query("SET LOCAL lock_timeout = '5s'");
  const transactionalQuery = async (sql, values) => {
    if (sql === "BEGIN") return query("SAVEPOINT contact_settings_route");
    if (sql === "COMMIT") return query("RELEASE SAVEPOINT contact_settings_route");
    if (sql === "ROLLBACK") {
      await query("ROLLBACK TO SAVEPOINT contact_settings_route");
      return query("RELEASE SAVEPOINT contact_settings_route");
    }
    if (injectFailure && /^INSERT INTO availability/.test(sql)) throw new Error("Simulated availability failure for rollback test");
    return query(sql, values);
  };
  db.query = transactionalQuery;
  db.connect = async () => ({ query: transactionalQuery, release() {} });
  const { app } = await import("../apps/api/src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const token = signAdminToken({ sub: randomUUID(), email: "integration@example.invalid", role: "admin" });
  const request = (path, body, authorized = true) => fetch(`${base}${path}`, {
    method: body ? "PUT" : "GET",
    headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  assert.equal((await request("/api/admin/settings", undefined, false)).status, 401);
  const current = await request("/api/admin/settings").then(r => r.json());
  assert.ok(!Object.hasOwn(current, "smtp_password_encrypted"));
  const hours = await request("/api/admin/availability").then(r => r.json());
  // Validate with nonsecret placeholder SMTP values; the encrypted password is preserved.
  const payload = settingsPayload({ ...current, map_query: "Babahoyo, Ecuador", map_embed_url: "https://www.google.com/maps/embed?pb=integration-test", map_enabled: true, map_load_on_click: false, office_directions: "Referencia temporal de prueba", contact_heading: "Contacto de prueba transaccional", whatsapp_message: "Mensaje de prueba" }, hours, "");
  const saveResponse = await request("/api/admin/settings", payload);
  const saved = await saveResponse.json();
  assert.equal(saveResponse.status, 200, `Save failed: ${saved.error ?? "unknown"}`);
  assert.equal(saved.contact_heading, payload.contactHeading);
  assert.equal(saved.map_embed_url, payload.mapEmbedUrl);
  assert.equal(saved.smtpPasswordConfigured, current.smtpPasswordConfigured);
  assert.ok(!Object.hasOwn(saved, "smtp_password_encrypted"));
  const publicSettings = await request("/api/public/settings", undefined, false).then(r => r.json());
  assert.equal(publicSettings.map_query, payload.mapQuery);
  assert.equal(publicSettings.whatsapp_message, payload.whatsappMessage);
  assert.ok(!Object.keys(publicSettings).some(key => key.startsWith("smtp_")));
  const afterSave = await fingerprint();

  const invalid = await request("/api/admin/settings", { ...payload, contactHeading: "Must not be saved", mapEmbedUrl: "https://evil.example/embed" });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await fingerprint(), afterSave);

  const invalidHours = await request("/api/admin/settings", { ...payload, contactHeading: "Must not be saved", availability: [{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00", slotMinutes: 60, active: true }] });
  assert.equal(invalidHours.status, 400);
  assert.deepEqual(await fingerprint(), afterSave);

  injectFailure = true;
  const failed = await request("/api/admin/settings", { ...payload, contactHeading: "Must roll back", availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotMinutes: 60, active: true }] });
  assert.equal(failed.status, 500);
  injectFailure = false;
  assert.deepEqual(await fingerprint(), afterSave, "Partial settings or availability writes were not rolled back");

  const legacy = { ...payload };
  for (const key of ["mapEnabled", "mapEmbedUrl", "mapQuery", "mapLoadOnClick", "officeDirections", "contactHeading", "contactIntro", "whatsappMessage", "availability"]) delete legacy[key];
  assert.equal((await request("/api/admin/settings", legacy)).status, 200);
  const preserved = await request("/api/public/settings", undefined, false).then(r => r.json());
  assert.equal(preserved.map_embed_url, payload.mapEmbedUrl);
  assert.equal(preserved.map_load_on_click, false);
  console.log("PASS: protected admin, public map data, settings save, invalid input rejection, atomic rollback and legacy-client compatibility.");
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  db.query = poolQuery;
  db.connect = poolConnect;
  try {
    await query("ROLLBACK");
    assert.deepEqual(await fingerprint(), before, "Database changed outside the test transaction");
    console.log("PASS: original settings and availability fully preserved; no emails or appointments created.");
  } finally { release(); await db.end(); }
}
