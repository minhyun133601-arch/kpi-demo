import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [scheme, salt, digest] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !digest) return false;
  const derived = await scryptAsync(String(password), salt, 64);
  const left = Buffer.from(digest, 'hex');
  const right = Buffer.from(derived);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function randomToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
