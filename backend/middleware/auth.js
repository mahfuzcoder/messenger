import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, createdAt: user.createdAt };
}

export function issueToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function tokenCookieOptions() {
  const crossSite = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: crossSite ? 'none' : 'lax',
    secure: crossSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

export function allowedOrigins() {
  return String(process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Allows configured CLIENT_ORIGINs plus the service's own origin, so a single Render
// instance that serves both the React build and the API works without extra config.
export function isAllowedOrigin(origin, request) {
  if (!origin) return true; // non-browser clients (curl, tests) send no Origin header
  if (allowedOrigins().includes(origin)) return true;
  if (!request) return false;
  const headers = request.headers || {};
  const host = typeof request.get === 'function' ? request.get('host') : headers.host;
  const forwarded = String(headers['x-forwarded-proto'] || '').split(',')[0].trim(); // Render terminates TLS
  const protocol = request.protocol || forwarded || 'http';
  return Boolean(host) && origin === `${protocol}://${host}`;
}

export async function auth(req, res, next) {
  try {
    const token = req.cookies?.token || req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session is no longer valid.' });
  }
}

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
