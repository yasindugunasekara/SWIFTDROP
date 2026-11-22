import { db } from '../../config/database.js';
import type { OperationalDatabase } from './database.js';

export async function loadServiceConfig(database: OperationalDatabase = db) {
  const result = await database.query(`SELECT settings FROM public.service_settings WHERE id=true`);
  if (!result.rows[0]) throw new Error('Service pricing has not been configured');
  const zones = await database.query(`SELECT id,zone_name AS "zoneName",base_rate::float AS "baseRate",
    per_kg_rate::float AS "perKgRate",per_km_rate::float AS "perKmRate",is_active AS "isActive"
    FROM public.delivery_zones ORDER BY zone_name,id`);
  return { ...result.rows[0].settings, zones: zones.rows };
}

export async function quoteDelivery(input: { weightKg: number; lengthCm?: number; widthCm?: number; heightCm?: number;
  zoneId?: string; distanceKm?: number; category?: string; promoCode?: string }, database: OperationalDatabase = db) {
  const config = await loadServiceConfig(database);
  const zone = input.zoneId ? config.zones.find((z: any) => z.id === input.zoneId && z.isActive)
    : config.zones.find((z: any) => z.isActive);
  if (!zone) throw new Error('No active delivery zone found');
  const volumetric = input.lengthCm && input.widthCm && input.heightCm
    ? input.lengthCm * input.widthCm * input.heightCm / 5000 : 0;
  const chargeableKg = Math.max(input.weightKg, volumetric);
  const baseFee = Number(input.zoneId ? zone.baseRate : config.baseBookingFee);
  const weightFee = Math.round(chargeableKg * Number(input.zoneId ? zone.perKgRate : config.perKgRate) * 100) / 100;
  const distanceFee = Math.round((input.distanceKm ?? 10) * Number(input.zoneId ? zone.perKmRate : config.perKmRate) * 100) / 100;
  const subtotal = Math.round((baseFee + weightFee + distanceFee) * 100) / 100;
  // Promotions are intentionally explicit; client-provided prices are ignored.
  const discountRate = input.promoCode?.toUpperCase() === 'SWIFT20' ? .2 : input.promoCode?.toUpperCase() === 'SWIFT10' ? .1 : 0;
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  return { zoneId: zone.id, zoneName:zone.zoneName, distanceKm:input.distanceKm??10, baseFee, weightFee, dimensionFee: 0, distanceFee, subtotal, discount,
    totalFee: Math.round((subtotal - discount) * 100) / 100, currency: 'LKR',
    category: input.category ?? 'Parcels', weightKg: input.weightKg, chargeableKg,
    appliedPromo: discountRate ? input.promoCode?.toUpperCase() : undefined, estimatedDelivery: 'Within 1-3 business days' };
}

export async function saveServiceConfig(updates: Record<string, unknown>, database: OperationalDatabase = db) {
  const { zones, ...settings } = updates;
  // One statement: settings and zones commit together, also with the HTTPS SQL bridge.
  await database.query(`WITH updated AS (
    UPDATE public.service_settings SET settings=settings || $1::jsonb,updated_at=now() WHERE id=true RETURNING id
  ), zone_inputs AS (
    SELECT * FROM jsonb_to_recordset($2::jsonb) AS z(id text,"zoneName" text,"baseRate" numeric,"perKgRate" numeric,"perKmRate" numeric,"isActive" boolean)
  ) INSERT INTO public.delivery_zones(id,zone_name,base_rate,per_kg_rate,per_km_rate,is_active)
    SELECT CASE WHEN id ~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' THEN id::uuid ELSE gen_random_uuid() END,
      "zoneName","baseRate","perKgRate","perKmRate",coalesce("isActive",true) FROM zone_inputs
    ON CONFLICT(id) DO UPDATE SET zone_name=excluded.zone_name,base_rate=excluded.base_rate,
      per_kg_rate=excluded.per_kg_rate,per_km_rate=excluded.per_km_rate,is_active=excluded.is_active`,
    [JSON.stringify(settings), JSON.stringify(zones ?? [])]);
  return loadServiceConfig(database);
}
