import "dotenv/config";
import { resolve } from "node:path";
import { configuredFrontendOrigins } from "./cors-origin.js";

const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
};

const encryptionKeyValue = required("CONFIG_ENCRYPTION_KEY");
const encryptionKeyBuffer = /^[a-f0-9]{64}$/i.test(encryptionKeyValue)
  ? Buffer.from(encryptionKeyValue, "hex")
  : Buffer.from(encryptionKeyValue, "base64");

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  databaseCaCert: process.env.DATABASE_CA_CERT ? resolve(process.cwd(), process.env.DATABASE_CA_CERT) : "",
  frontendUrls: configuredFrontendOrigins(process.env.FRONTEND_URL, process.env.NODE_ENV ?? "development"),
  jwtSecret: required("JWT_SECRET"),
  encryptionKey: encryptionKeyValue,
  encryptionKeyBuffer,
  adminSeedEmail: required("ADMIN_SEED_EMAIL", "admin@alcivarlegal.local").toLowerCase(),
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD ?? "",
  uploadsDir: resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads"),
  publicApiUrl: required("PUBLIC_API_URL", "http://localhost:4000")
};

if (config.jwtSecret.length < 32) throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
if (config.encryptionKeyBuffer.length !== 32) {
  throw new Error("CONFIG_ENCRYPTION_KEY debe ser una clave de 32 bytes (64 caracteres hexadecimales o base64)");
}
