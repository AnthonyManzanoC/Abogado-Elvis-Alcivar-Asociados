import crypto from "node:crypto";
import { encryptSecret } from "./security.js";

export function hashTrackingToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
export function createTrackingAccess() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashTrackingToken(token), encrypted: encryptSecret(token) };
}
export function receiptMime(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return "";
}
export function adminRecord(row: Record<string, unknown>) {
  const { tracking_hash, tracking_token_encrypted, ...safe } = row;
  return safe;
}
