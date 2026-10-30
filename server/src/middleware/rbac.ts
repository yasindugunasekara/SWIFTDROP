import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export const requireRoles = (allowedRoles: Array<'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};
