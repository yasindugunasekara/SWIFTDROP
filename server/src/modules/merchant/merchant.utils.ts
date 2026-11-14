import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { ZodError } from 'zod';

// Member 6 — helpers used only by the merchant module.

/** Error carrying an HTTP status, thrown from merchant route handlers. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Express 4 does not forward rejected promises to the error handler, so each
 * async merchant route is wrapped to turn thrown errors into JSON responses.
 */
export const asyncHandler =
  <R extends Request = Request>(fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as R, res, next).catch((err: any) => {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const field = first?.path.join('.');
        return res.status(400).json({
          error: first ? `${field ? `${field}: ` : ''}${first.message}` : 'Validation failed',
          details: err.flatten().fieldErrors,
        });
      }
      if (err?.code === '22P02') {
        // Postgres: invalid UUID / enum text
        return res.status(400).json({ error: 'Invalid identifier or value format' });
      }
      console.error('[merchant] Unhandled route error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err?.message : undefined,
      });
    });
  };

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/** Generates a tracking number such as SWIFT-7K3QX9P2 (no ambiguous 0/O/1/I). */
export const generateTrackingNumber = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (const b of crypto.randomBytes(8)) out += alphabet[b % alphabet.length];
  return `SWIFT-${out}`;
};
