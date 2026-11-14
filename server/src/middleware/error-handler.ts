import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = (err as Error & { status?: number }).status;
  if (status === 400 || status === 413) {
    res.status(status).json({ error: status === 413 ? 'Request body is too large.' : 'Invalid request body.' });
    return;
  }
  console.error('Unhandled application error:', err.name);
  res.status(500).json({
    error: 'Internal Server Error',
  });
};
