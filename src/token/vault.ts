import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class TokenVault {
  private key() {
    const secret = process.env.TOKEN_SECRET;
    if (!secret) throw new Error("缺少 TOKEN_SECRET");
    return createHash("sha256").update(secret).digest();
  }

  encrypt(plain: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64url");
  }

  decrypt(payload: string) {
    const raw = Buffer.from(payload, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}

export const tokenVault = new TokenVault();
