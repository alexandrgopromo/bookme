import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret-do-not-use-in-prod';

// Hash for "password123" (generated via bcryptjs)
const ADMIN_HASH = '$2b$10$urD08dxvsvp4UyY6Z9ipauvAE3.G5BpOCyVi5te.khnnQBUY7bP1C';

export function verifyPassword(password: string): boolean {
  return bcrypt.compareSync(password, ADMIN_HASH);
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
