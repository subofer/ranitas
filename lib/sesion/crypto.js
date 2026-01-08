//const crypto = require('crypto');
import crypto from 'crypto';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  const derivedKey = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64);
  return key === derivedKey.toString('hex');
}
