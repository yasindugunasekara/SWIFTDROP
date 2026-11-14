import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createAuthenticationMiddleware, type AuthRequest } from '../../middleware/auth.js';
import { AuthServiceError, authGateway, type AuthGateway } from './auth.service.js';
import { config } from '../../config/env.js';
import { publicAuthConfig } from '../../config/supabase.js';

const email = z.string().trim().toLowerCase().max(255).email('Enter a valid email address.');
const name = z.string().trim().min(2, 'Enter your full name.').max(150)
  .refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Name contains invalid characters.');
export const customerSignupSchema = z.object({ fullName: name, email,
  password: z.string().min(8, 'Use at least 8 characters.').max(72)
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.'),
  confirmPassword: z.string().max(72), role: z.literal('CUSTOMER').optional(),
}).strict().superRefine((input, context) => {
  if (input.password !== input.confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom,
    path: ['confirmPassword'], message: 'Passwords do not match.' });
});

// Requests are onboarding data, never authorization claims. The existing Auth
// trigger still creates a CUSTOMER; staff must review and provision access.
const applicationSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('COURIER'), phone: z.string().trim().min(7).max(30), address: z.string().trim().min(3).max(300),
    vehicleType: z.enum(['Motorcycle', 'Car', 'Van', 'Bicycle']), vehicleNumber: z.string().trim().max(30).optional() }).strict(),
  z.object({ role: z.literal('MERCHANT'), phone: z.string().trim().min(7).max(30), address: z.string().trim().min(5).max(300),
    companyName: z.string().trim().min(2).max(255), registrationNumber: z.string().trim().min(2).max(100) }).strict(),
]);

export function createAuthRouter(gateway: AuthGateway = authGateway) {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(gateway);
  const run = (handler: (req: AuthRequest, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try { await handler(req as AuthRequest, res); }
      catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ error: 'Please check the information you entered.', code: 'VALIDATION_ERROR', fields: error.flatten().fieldErrors });
        } else if (error instanceof AuthServiceError) {
          res.status(error.status).json({ error: error.message, code: error.code });
        } else res.status(503).json({ error: 'Authentication service unavailable. Please retry.', code: 'AUTH_UNAVAILABLE' });
      }
    };
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const signupLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true,
    legacyHeaders: false, message: { error: 'Too many signup attempts. Please try again later.', code: 'RATE_LIMITED' } });
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skipSuccessfulRequests: true,
    standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please retry later.' } });
  const refreshLimit = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true,
    legacyHeaders: false, message: { error: 'Too many session refresh attempts. Please retry shortly.', code: 'RATE_LIMITED' } });

  router.get('/config', (_req, res) => {
    try { res.json(publicAuthConfig()); }
    catch { res.status(503).json({ error: 'Supabase Auth is not configured.' }); }
  });
  router.post('/register', signupLimit, run(async (req, res) => {
    const input = customerSignupSchema.parse(req.body);
    const result = await gateway.register(input);
    res.status(result.requiresEmailConfirmation ? 202 : 201).json({ ...result,
      message: result.requiresEmailConfirmation ? 'Check your email to confirm your account. If it already exists, sign in instead.' : 'Your customer account has been created. You can now sign in.' });
  }));
  router.post('/register-application', signupLimit, run(async (req, res) => {
    const payload = z.object({ fullName: z.unknown(), email: z.unknown(), password: z.unknown(), confirmPassword: z.unknown(), application: z.unknown() }).strict().parse(req.body);
    const credentials = customerSignupSchema.parse({ fullName: payload.fullName, email: payload.email, password: payload.password, confirmPassword: payload.confirmPassword });
    const { role, ...details } = applicationSchema.parse(payload.application);
    if (role === 'COURIER' && ('vehicleType' in details ? details.vehicleType : undefined) !== 'Bicycle' && !('vehicleNumber' in details && details.vehicleNumber)) {
      throw new AuthServiceError(400, 'VALIDATION_ERROR', 'Enter your vehicle registration number.');
    }
    const result = await gateway.register({ ...credentials, application: { ...details, requestedRole: role } });
    res.status(202).json({ ...result, requiresApproval: true, message: 'Confirm your email. SwiftDrop must review your application before courier or business access is enabled.' });
  }));
  router.post('/login', loginLimit, run(async (req, res) => {
    const input = z.object({ email, password: z.string().min(1).max(256) }).strict().parse(req.body);
    res.json(await gateway.login(input.email, input.password));
  }));
  router.post('/refresh', refreshLimit, run(async (req, res) => {
    const input = z.object({ refreshToken: z.string().min(1).max(8192) }).strict().parse(req.body);
    res.json(await gateway.refresh(input.refreshToken));
  }));
  router.post('/google', loginLimit, run(async (req, res) => {
    const input = z.object({ idToken: z.string().min(1).max(16384) }).strict().parse(req.body);
    res.json(await gateway.google(input.idToken));
  }));
  router.post('/logout', authenticate, run(async (req, res) => {
    await gateway.logout(req.headers.authorization!.slice(7)); res.json({ message: 'Signed out' });
  }));
  router.get('/me', authenticate, run(async (req, res) => { res.json({ user: req.user }); }));
  router.patch('/me', authenticate, run(async (req, res) => {
    const input = z.object({ fullName: name, phone: z.string().trim().max(30).nullable().optional() }).strict().parse(req.body);
    res.json({ user: await gateway.updateProfile(req.headers.authorization!.slice(7), input) });
  }));
  return router;
}
export default createAuthRouter();
