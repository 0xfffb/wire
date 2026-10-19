import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export class PasswordHasher {
  async hash(password: string) {
    const salt = randomBytes(16).toString("base64url");
    const derived = (await scrypt(password, salt, 32)) as Buffer;
    return { salt, hash: derived.toString("base64url") };
  }

  async verify(password: string, salt: string, expected: string) {
    const derived = (await scrypt(password, salt, 32)) as Buffer;
    const actual = Buffer.from(expected, "base64url");
    if (actual.length !== derived.length) return false;
    return timingSafeEqual(actual, derived);
  }
}

export const passwords = new PasswordHasher();
