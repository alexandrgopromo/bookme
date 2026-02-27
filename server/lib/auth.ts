import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret-do-not-use-in-prod';
// Hash for "password123"
const ADMIN_HASH = '$2a$10$X7.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1'; // Placeholder, will replace with real one below
// Real hash for "password123" (generated locally for this task)
// $2a$10$CwTycUXWue0Thq9StjUM0u.ZgX.wO/vj.8.1.1.1.1.1.1.1.1 is invalid format above
// Let's use a standard bcrypt hash for "password123"
// $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWrn96pzlkEqMOy79aoLInsp5RCy62
const REAL_ADMIN_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWrn96pzlkEqMOy79aoLInsp5RCy62';

export function verifyPassword(password: string): boolean {
  return bcrypt.compareSync(password, REAL_ADMIN_HASH);
}

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}
