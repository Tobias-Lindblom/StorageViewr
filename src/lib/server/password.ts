import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return ["scrypt-v1", salt, key.toString("hex")].join("$");
}
export async function verifyPassword(password: string, encoded: string) {
  const [version, salt, hash] = encoded.split("$");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hash ?? "")
  )
    return false;
  return timingSafeEqual(
    await derive(password, salt),
    Buffer.from(hash, "hex"),
  );
}
// Unknown accounts still perform the same expensive derivation.
export const dummyPasswordHash = [
  "scrypt-v1",
  "0".repeat(32),
  "0".repeat(128),
].join("$");
