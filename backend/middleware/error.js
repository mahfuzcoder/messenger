import multer from 'multer';

export function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      error: error.code === 'LIMIT_FILE_SIZE' ? 'File size must be 25 MB or less.' : 'Upload could not be processed.'
    });
  }
  // Malformed or oversized JSON bodies are client mistakes, not server failures.
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error.message === 'This file type is not supported.') return res.status(415).json({ error: error.message });
  if (error.message?.includes('origin')) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
  if (error.name === 'ValidationError') return res.status(400).json({ error: 'Please check the submitted fields.' });
  // A malformed id in the URL (e.g. /api/messages/abc) must never surface as a 500.
  if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier in the request.' });
  process.stderr.write(`${error.stack || error}\n`);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
