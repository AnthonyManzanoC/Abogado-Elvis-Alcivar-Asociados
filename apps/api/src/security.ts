import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

export type AdminToken = { sub: string; email: string; role: "admin" };

export function signAdminToken(payload: AdminToken) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "8h", issuer: "alcivar-legal-api" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sesión requerida" });
  try {
    res.locals.admin = jwt.verify(token, config.jwtSecret, { issuer: "alcivar-legal-api" }) as AdminToken;
    next();
  } catch {
    return res.status(401).json({ error: "Sesión vencida o inválida" });
  }
}

export function encryptSecret(value: string) {
  if (!value) return "";
  const key = config.encryptionKeyBuffer;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  if (!value) return "";
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) return "";
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    config.encryptionKeyBuffer,
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64")),
    decipher.final()
  ]).toString("utf8");
}
