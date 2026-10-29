/**
 * Messenger web server — serves the React production build and a lightweight health check.
 * Express remains the Node.js entry point for hosted production deployments.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;
const buildDirectory = path.resolve(__dirname, '../frontend/dist');

// Returns a small status response for local and hosted health checks.
app.get('/health', (_request, response) => {
  response.json({ status: 'ok', app: 'nook-messenger' });
});

app.use(express.static(buildDirectory, { index: false }));

// Serves the messenger shell for the root URL and unknown browser routes.
app.get('*', (_request, response) => {
  response.sendFile(path.join(buildDirectory, 'index.html'));
});

// Starts the local web server on the configured port.
app.listen(port, () => {
  process.stdout.write(`Nook Messenger is available at http://localhost:${port}\n`);
});
