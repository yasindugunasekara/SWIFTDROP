import type { Request, Response, NextFunction } from 'express';
import { AuthServiceError, authGateway, type AuthGateway, type AuthProfile, type UserRole } from '../modules/auth/auth.service.js';

export interface AuthenticatedUser {
  id: string; email: string; role: UserRole; merchantId?: string; approvalStatus?: string;
  authUserId?: string; fullName?: string; phone?: string | null;
}
export interface AuthRequest extends Request { user?: AuthenticatedUser; }

export function createAuthenticationMiddleware(gateway: Pick<AuthGateway, 'authenticate'> = authGateway) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !/^Bearer \S+$/i.test(header)) return res.status(401).json({ error: 'Access token required' });
    try {
      req.user = await gateway.authenticate(header.slice(7));
      next();
    } catch (error) {
      const status = error instanceof AuthServiceError ? error.status : 503;
      res.status(status).json({ error: error instanceof AuthServiceError ? error.message : 'Authentication service unavailable.' });
    }
  };
}
export const authenticateToken = createAuthenticationMiddleware();
export type { AuthProfile };
