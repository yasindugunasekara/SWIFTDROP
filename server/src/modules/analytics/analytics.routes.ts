import { Router, Request, Response } from 'express';
import { db } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

const router = Router();

// Member 9 — Delivery Reports & Operational Analytics
// Secured with JWT Authentication & RBAC (Dispatcher & Admin only)
router.use(authenticateToken);
router.use(requireRoles(['DISPATCHER', 'ADMIN']));

/**
 * 1. Summary KPIs Endpoint
 * GET /api/v1/analytics/summary?range=7d
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '7d';
    let days = 7;
    if (range === 'today') days = 1;
    if (range === '30d') days = 30;

    const query = `
      SELECT
        COUNT(*)::int AS total_dispatched,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int AS delivered_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int AS failed_count,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_fee ELSE 0 END), 0)::float AS total_revenue,
        CASE
          WHEN COUNT(CASE WHEN status IN ('DELIVERED', 'FAILED') THEN 1 END) = 0 THEN 0.0
          ELSE ROUND(
            (COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::numeric /
             COUNT(CASE WHEN status IN ('DELIVERED', 'FAILED') THEN 1 END)::numeric) * 100, 2
          )::float
        END AS success_rate,
        CASE
          WHEN COUNT(CASE WHEN status IN ('DELIVERED', 'FAILED') THEN 1 END) = 0 THEN 0.0
          ELSE ROUND(
            (COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::numeric /
             COUNT(CASE WHEN status IN ('DELIVERED', 'FAILED') THEN 1 END)::numeric) * 100, 2
          )::float
        END AS failure_rate
      FROM parcels
      WHERE created_at >= NOW() - ($1 || ' days')::interval;
    `;

    const result = await db.query(query, [days]);
    const row = result.rows[0];

    return res.json({
      success: true,
      range,
      kpis: {
        totalDispatched: row.total_dispatched,
        deliveredCount: row.delivered_count,
        failedCount: row.failed_count,
        totalRevenue: row.total_revenue,
        successRate: row.success_rate,
        failureRate: row.failure_rate,
      },
    });
  } catch (error: any) { return res.status(503).json({error:'Analytics are temporarily unavailable.'}); }
});

/**
 * 2. Daily Deliveries & Volume Breakdown
 * GET /api/v1/analytics/daily-deliveries?range=7d
 */
router.get('/daily-deliveries', async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '7d';
    let days = 7;
    if (range === 'today') days = 1;
    if (range === '30d') days = 30;

    const query = `
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'Dy') AS day_name,
        DATE(created_at) AS delivery_date,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int AS delivered,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int AS failed,
        COUNT(*)::int AS total
      FROM parcels
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY DATE_TRUNC('day', created_at), DATE(created_at)
      ORDER BY DATE(created_at) ASC;
    `;

    const result = await db.query(query, [days]);

    const dailyCounts = result.rows.map((r: any) => ({
      date: r.day_name,
      fullDate: r.delivery_date,
      delivered: r.delivered,
      failed: r.failed,
      total: r.total,
    }));

    return res.json({
      success: true,
      range,
      dailyCounts,
    });
  } catch (error: any) { return res.status(503).json({error:'Analytics are temporarily unavailable.'}); }
});

/**
 * 3. Courier Workload & Performance Leaderboard
 * GET /api/v1/analytics/courier-performance
 */
router.get('/courier-performance', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        u.id AS courier_id,
        u.full_name AS name,
        u.phone AS phone,
        COUNT(CASE WHEN p.status = 'DELIVERED' THEN 1 END)::int AS completed_runs,
        COUNT(CASE WHEN p.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') THEN 1 END)::int AS active_runs,
        CASE
          WHEN COUNT(CASE WHEN p.status IN ('DELIVERED', 'FAILED') THEN 1 END) = 0 THEN 100.0
          ELSE ROUND(
            (COUNT(CASE WHEN p.status = 'DELIVERED' THEN 1 END)::numeric /
             COUNT(CASE WHEN p.status IN ('DELIVERED', 'FAILED') THEN 1 END)::numeric) * 100, 1
          )::float
        END AS success_rate,
        COALESCE(ROUND(AVG(
          EXTRACT(EPOCH FROM (p.updated_at - p.created_at)) / 60
        )::numeric, 0), 40)::int AS avg_time_mins
      FROM users u
      LEFT JOIN courier_assignments ca ON u.id = ca.courier_id AND ca.is_active = TRUE
      LEFT JOIN parcels p ON ca.parcel_id = p.id
      WHERE u.role = 'COURIER'
      GROUP BY u.id, u.full_name, u.phone
      ORDER BY completed_runs DESC, success_rate DESC
      LIMIT 10;
    `;

    const result = await db.query(query);

    const couriers = result.rows.map((row: any) => ({
      id: row.courier_id,
      name: row.name,
      phone: row.phone || 'N/A',
      completedRuns: row.completed_runs,
      activeRuns: row.active_runs,
      successRate: row.success_rate,
      avgTimeMins: row.avg_time_mins,
    }));

    return res.json({
      success: true,
      couriers,
    });
  } catch (error: any) { return res.status(503).json({error:'Analytics are temporarily unavailable.'}); }
});

export default router;
