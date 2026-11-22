/**
 * Member 07 — Notification inbox and preference REST API.
 *
 * Base path: /api/v1/notifications (mounted in server/src/app.ts)
 *
 * Security
 *   * Every endpoint requires a verified Supabase session.
 *   * Only CUSTOMER and COURIER accounts are allowed by requireRoles.
 *   * Ownership always comes from req.user.id. No endpoint accepts a user id
 *     from the query string or body, so a caller cannot select another inbox.
 *   * Cross-user notification ids return 404 (not 403), which avoids disclosing
 *     whether a notification exists.
 *
 * Testability
 *   * createNotificationRouter accepts the authenticate middleware and service,
 *     mirroring createAuthRouter(gateway). Production uses the real middleware
 *     and PostgreSQL-backed service; tests inject a fake gateway and PGlite.
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  authenticateToken,
  type AuthenticatedUser,
  type AuthRequest,
} from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  decodeNotificationCursor,
  notificationService,
  type NotificationService,
} from './notification.service.js';
import { NOTIFICATION_TYPES } from './notification.types.js';

type AuthenticatedRequest = AuthRequest & { user: AuthenticatedUser };

const notificationIdSchema = z
  .string()
  .uuid('A valid notification id is required.');

const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(512).optional(),
    isRead: z.enum(['true', 'false']).optional(),
    type: z.enum(NOTIFICATION_TYPES).optional(),
  })
  .strict();

const preferenceUpdateSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
  })
  .strict()
  .refine(
    value =>
      value.pushEnabled !== undefined ||
      value.emailEnabled !== undefined ||
      value.smsEnabled !== undefined,
    { message: 'Provide at least one preference to update.', path: ['pushEnabled'] },
  );

export interface NotificationRouterDependencies {
  authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;
  service: NotificationService;
}

export function createNotificationRouter({
  authenticate,
  service,
}: NotificationRouterDependencies): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireRoles(['CUSTOMER', 'COURIER']));
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const run = (handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        await handler(req as AuthenticatedRequest, res);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            error: 'Please check the request.',
            code: 'VALIDATION_ERROR',
            fields: error.flatten().fieldErrors,
          });
          return;
        }

        // Never leak database or provider details to the client.
        console.error('Notification API error:', error);
        res.status(500).json({ error: 'Notification service unavailable. Please retry.' });
      }
    };

  const listHandler = run(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const cursor = query.cursor ? decodeNotificationCursor(query.cursor) : undefined;

    if (query.cursor && !cursor) {
      res.status(400).json({
        error: 'Invalid pagination cursor.',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await service.listNotifications(req.user.id, {
      limit: query.limit,
      ...(cursor ? { cursor } : {}),
      ...(query.isRead !== undefined ? { isRead: query.isRead === 'true' } : {}),
      ...(query.type ? { type: query.type } : {}),
    });

    res.json({
      notifications: result.notifications,
      count: result.notifications.length,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  });

  // Current endpoint.
  router.get('/', listHandler);

  // Deprecated alias for the original Member 07 stub; same ownership and shape.
  router.get('/inbox', listHandler);

  router.get('/unread-count', run(async (req, res) => {
    const unreadCount = await service.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  }));

  router.patch('/read-all', run(async (req, res) => {
    const updatedCount = await service.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read', updatedCount });
  }));

  router.patch('/:id/read', run(async (req, res) => {
    const notificationId = notificationIdSchema.parse(req.params.id);
    const notification = await service.markRead(req.user.id, notificationId);

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read', notification });
  }));

  router.get('/preferences', run(async (req, res) => {
    const preferences = await service.getPreferences(req.user.id);
    res.json({ preferences });
  }));

  router.put('/preferences', run(async (req, res) => {
    const patch = preferenceUpdateSchema.parse(req.body);
    const preferences = await service.updatePreferences(req.user.id, patch);
    res.json({ message: 'Notification preferences updated', preferences });
  }));

  return router;
}

export default createNotificationRouter({
  authenticate: authenticateToken,
  service: notificationService,
});
