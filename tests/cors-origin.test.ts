import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalProductionFrontendOrigin,
  configuredFrontendOrigins,
  isAllowedCorsOrigin
} from "../apps/api/src/cors-origin.js";

test("production CORS includes the canonical Vercel origin when FRONTEND_URL is missing", () => {
  assert.deepEqual(configuredFrontendOrigins(undefined, "production"), [canonicalProductionFrontendOrigin]);
});

test("configured origins are strict, de-duplicated and normalize only a final slash", () => {
  const origins = configuredFrontendOrigins(
    " https://abogado-elvis-alcivar-asociados.vercel.app/ , https://www.alcivarlegal.ec/ ",
    "production"
  );
  assert.deepEqual(origins, [canonicalProductionFrontendOrigin, "https://www.alcivarlegal.ec"]);
  assert.equal(isAllowedCorsOrigin(canonicalProductionFrontendOrigin, origins), true);
  assert.equal(isAllowedCorsOrigin("https://preview-alcivar.vercel.app", origins), false);
  assert.equal(isAllowedCorsOrigin("https://abogado-elvis-alcivar-asociados.vercel.app/", origins), false);
});

test("configured CORS rejects paths, credentials and non-web protocols", () => {
  for (const value of [
    "https://abogado-elvis-alcivar-asociados.vercel.app/admin",
    "https://user:pass@abogado-elvis-alcivar-asociados.vercel.app",
    "https://abogado-elvis-alcivar-asociados.vercel.app?preview=1",
    "file:///tmp/site"
  ]) {
    assert.throws(() => configuredFrontendOrigins(value, "production"));
  }
});
