/** Nook Messenger API: MongoDB models, JWT auth, REST routes and Socket.IO. */
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { allowedOrigins, isAllowedOrigin } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { conversationRoutes } from './routes/conversations.js';
import { messageRoutes } from './routes/messages.js';
import { createUploader, cloudinaryEnabled } from './utils/upload.js';
import { registerSockets } from './sockets/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in the environment.');
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const dir = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(dir, '../uploads');
const frontendDir = path.resolve(dir, '../frontend/dist');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = createUploader(uploadDir);

// Socket.IO: CORS headers are echoed back here, while allowRequest (which sees the actual
// request) rejects browsers that come from an origin that is not allowed.
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin, { headers: req.headers }))
});
registerSockets(io);

app.set('trust proxy', 1); // Render runs behind a proxy — keep the real client IP for rate limiting
app.disable('x-powered-by');

// Helmet's default CSP is too tight for a chat app: it would block CDN media, local
// blob previews and the API/websocket connection, so those sources are opened up.
const cspDirectives = {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'media-src': ["'self'", 'blob:', 'https:'],
  'connect-src': ["'self'", 'blob:', 'https:', 'ws:', 'wss:', ...allowedOrigins()]
};
if (!isProduction) delete cspDirectives['upgrade-insecure-requests']; // no https on localhost
// useDefaults: false → only these directives are sent, so the line above actually takes effect
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: { useDefaults: false, directives: cspDirectives } }));

// CORS: configured client origins + this service's own origin (React build served by the same instance).
app.use((req, res, next) => {
  const origin = req.get('origin');
  cors({ origin: Boolean(origin) && isAllowedOrigin(origin, req), credentials: true })(req, res, next);
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));

// CSRF guard: browsers always attach Origin to state-changing requests, anything else is refused.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!isAllowedOrigin(req.get('origin'), req)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  next();
});

// Broad safety net for the API (auth endpoints use a much stricter limiter of their own).
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes(upload));
app.use('/api/conversations', conversationRoutes(io, upload));
app.use('/api', messageRoutes(io, upload));

app.get('/health', (_req, res) => res.json({
  status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
  app: 'nook-messenger',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}));

// Serves the production React build when it exists (Vite output), otherwise the API answers alone.
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
    res.sendFile(path.join(frontendDir, 'index.html'), (error) => error && next(error));
  });
} else {
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
}

app.use(errorHandler); // registered last: every unhandled error becomes a safe JSON response

// A missing/wrong Atlas URI fails fast with a readable message instead of a stack trace.
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nook_messenger', { serverSelectionTimeoutMS: 10000 });
} catch (error) {
  process.stderr.write(`MongoDB connection failed: ${error.message}\n`);
  process.exit(1);
}

if (isProduction && !cloudinaryEnabled()) {
  process.stderr.write('CLOUDINARY_* is not set: uploads use the temporary disk and are lost on every redeploy.\n');
}

server.listen(PORT, () => process.stdout.write(`Nook Messenger API is available at http://localhost:${PORT}\n`));

// Render stops services with SIGTERM — finish open requests and close the DB before exiting.
const shutdown = (signal) => () => {
  process.stdout.write(`${signal} received, shutting down.\n`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
