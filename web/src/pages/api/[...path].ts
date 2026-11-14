import app from '../../../../server/dist/app.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Express owns parsing, validation, auth and responses. Importing app never starts
// a listener or a WebSocket server: Next/Vercel supplies the HTTP server.
export const config = {
  api: { bodyParser: false, externalResolver: true },
  maxDuration: 60,
};

export default function handler(request: IncomingMessage, response: ServerResponse) {
  // Next adds this header locally too. Only Vercel's forwarding hop is trusted;
  // local requests use the socket address for the existing IP rate limits.
  if (!process.env.VERCEL) delete request.headers['x-forwarded-for'];
  return app(request, response);
}
