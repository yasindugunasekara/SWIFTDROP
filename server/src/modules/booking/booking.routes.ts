import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticateToken, type AuthRequest } from '../../middleware/auth.js';

import { requireRoles } from '../../middleware/rbac.js';
import { randomUUID } from 'node:crypto';

// Pricing constants & category base rates
export const CATEGORY_BASE_RATES: Record<string, { baseFee: number; label: string; ratePerKg: number }> = {
  parcels: { baseFee: 8.50, label: 'Parcels', ratePerKg: 1.50 },
  documents: { baseFee: 4.50, label: 'Documents', ratePerKg: 1.00 },
  electronics: { baseFee: 12.50, label: 'Electronics', ratePerKg: 2.00 },
  gift_box: { baseFee: 6.20, label: 'Gift Box', ratePerKg: 1.50 },
  apparel: { baseFee: 7.00, label: 'Apparel', ratePerKg: 1.25 },
  heavy_cargo: { baseFee: 25.00, label: 'Heavy Cargo', ratePerKg: 2.50 },
  doc: { baseFee: 4.50, label: 'Documents', ratePerKg: 1.00 },
  small: { baseFee: 8.50, label: 'Small Box', ratePerKg: 1.50 },
  medium: { baseFee: 12.50, label: 'Medium Box', ratePerKg: 2.00 },
  large: { baseFee: 25.00, label: 'Large Cargo', ratePerKg: 2.50 },
};

export const PROMO_CODES: Record<string, { discountPercent?: number; fixedDiscount?: number }> = {
  SWIFT20: { discountPercent: 20 },
  SWIFT10: { discountPercent: 10 },
  FIRSTFREE: { fixedDiscount: 5.00 },
};

export interface FeeCalculationResult {
  baseFee: number;
  weightFee: number;
  dimensionFee: number;
  subtotal: number;
  discount: number;
  totalFee: number;
  currency: string;
  category: string;
  weightKg: number;
  appliedPromo?: string;
  estimatedDelivery: string;
}

/**
 * Server-side dynamic fee calculation.
 * Never trust a price or total sent by the client!
 */
export function calculateServerFee(input: {
  category?: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  promoCode?: string;
}): FeeCalculationResult {
  const catKey = (input.category || 'parcels').toLowerCase().replace(/\s+/g, '_');
  const catConfig = CATEGORY_BASE_RATES[catKey] || CATEGORY_BASE_RATES.parcels;

  const baseFee = catConfig.baseFee;
  const weight = Math.max(0.1, input.weightKg);

  // First 1.0 kg included in base fee, remaining charged per kg
  const chargeableWeight = Math.max(0, weight - 1.0);
  const weightFee = Number((chargeableWeight * catConfig.ratePerKg).toFixed(2));

  // Volumetric dimension fee check
  let dimensionFee = 0;
  if (input.lengthCm && input.widthCm && input.heightCm) {
    const volWeight = (input.lengthCm * input.widthCm * input.heightCm) / 5000;
    if (volWeight > weight) {
      dimensionFee = Number(((volWeight - weight) * 0.75).toFixed(2));
    }
  }

  const subtotal = Number((baseFee + weightFee + dimensionFee).toFixed(2));

  // Apply server-verified promotional discount
  let discount = 0;
  let appliedPromo: string | undefined;
  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    const promo = PROMO_CODES[code];
    if (promo) {
      appliedPromo = code;
      if (promo.discountPercent) {
        discount = Number(((subtotal * promo.discountPercent) / 100).toFixed(2));
      } else if (promo.fixedDiscount) {
        discount = Math.min(subtotal, promo.fixedDiscount);
      }
    }
  }

  const totalFee = Number(Math.max(1.00, subtotal - discount).toFixed(2));

  return {
    baseFee,
    weightFee,
    dimensionFee,
    subtotal,
    discount,
    totalFee,
    currency: 'USD',
    category: catConfig.label,
    weightKg: weight,
    appliedPromo,
    estimatedDelivery: catKey === 'heavy_cargo' || catKey === 'large' ? 'Within 24 hours' : 'Within 2 hours',
  };
}

// Zod schemas for validation
export const quoteRequestSchema = z.object({
  pickupAddress: z.string().trim().min(3, 'Pickup address is required.'),
  dropoffAddress: z.string().trim().min(3, 'Dropoff address is required.'),
  weightKg: z.number().positive('Weight must be positive.').max(100, 'Weight cannot exceed 100 kg.'),
  category: z.string().optional(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  promoCode: z.string().optional(),
});

export const createBookingSchema = z.object({
  pickupAddress: z.string().trim().min(3, 'Pickup address is required.'),
  dropoffAddress: z.string().trim().min(3, 'Dropoff address is required.'),
  senderName: z.string().trim().min(2, 'Sender name is required.').default('Kasun Perera'),
  senderPhone: z.string().trim().min(5, 'Sender phone is required.').default('+94 77 123 4567'),
  recipientName: z.string().trim().min(2, 'Recipient name is required.').default('Recipient Customer'),
  recipientPhone: z.string().trim().min(5, 'Recipient phone is required.').default('+94 71 987 6543'),
  weightKg: z.number().positive('Weight must be positive.').max(100, 'Weight cannot exceed 100 kg.'),
  category: z.string().optional().default('parcels'),
  lengthCm: z.number().positive().optional().default(20),
  widthCm: z.number().positive().optional().default(15),
  heightCm: z.number().positive().optional().default(10),
  specialInstructions: z.string().optional().default(''),
  paymentMethod: z.enum(['wallet', 'card', 'cod']).default('wallet'),
  promoCode: z.string().optional(),
  // Client can send an estimated fee, but the server WILL OVERRIDE IT!
  clientFeeEstimate: z.number().optional(),
});

// In-memory persistent store for bookings during runtime
export interface StoredParcel {
  customerId?: string;
  id: string;
  trackingNumber: string;
  status: 'CONFIRMED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  dropoffAddress: string;
  category: string;
  weightKg: number;
  dimensions: { length: number; width: number; height: number };
  totalFee: number;
  feeBreakdown: FeeCalculationResult;
  paymentMethod: string;
  specialInstructions: string;
  estimatedPickup: string;
  createdAt: string;
}

export const activeBookings: StoredParcel[] = [
  {
    id: 'parcel-init-001',
    trackingNumber: 'SWIFT-991122',
    status: 'IN_TRANSIT',
    senderName: 'Kasun Perera',
    senderPhone: '+94 77 123 4567',
    pickupAddress: 'Elm Street, 23 (Colombo 03)',
    recipientName: 'Robert Smith',
    recipientPhone: '+94 71 555 0192',
    dropoffAddress: '742 Evergreen Terrace, Colombo 04',
    category: 'Parcels',
    weightKg: 1.2,
    dimensions: { length: 25, width: 20, height: 15 },
    totalFee: 8.50,
    feeBreakdown: {
      baseFee: 8.50,
      weightFee: 0.00,
      dimensionFee: 0.00,
      subtotal: 8.50,
      discount: 0.00,
      totalFee: 8.50,
      currency: 'USD',
      category: 'Parcels',
      weightKg: 1.2,
      estimatedDelivery: 'Within 2 hours',
    },
    paymentMethod: 'wallet',
    specialInstructions: 'Ring doorbell twice, leave at reception',
    estimatedPickup: '15 mins',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'parcel-init-002',
    trackingNumber: 'SWIFT-882233',
    status: 'OUT_FOR_DELIVERY',
    senderName: 'Kasun Perera',
    senderPhone: '+94 77 123 4567',
    pickupAddress: 'Elm Street, 23 (Colombo 03)',
    recipientName: 'Emily Davis',
    recipientPhone: '+94 76 333 4455',
    dropoffAddress: '10 Downing St, Colombo 07',
    category: 'Documents',
    weightKg: 0.8,
    dimensions: { length: 30, width: 22, height: 2 },
    totalFee: 4.50,
    feeBreakdown: {
      baseFee: 4.50,
      weightFee: 0.00,
      dimensionFee: 0.00,
      subtotal: 4.50,
      discount: 0.00,
      totalFee: 4.50,
      currency: 'USD',
      category: 'Documents',
      weightKg: 0.8,
      estimatedDelivery: 'Within 2 hours',
    },
    paymentMethod: 'wallet',
    specialInstructions: 'Important legal papers, sign required',
    estimatedPickup: 'Completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function createBookingRouter(authenticate: RequestHandler = authenticateToken) {
const router = Router();
// 1. Fee Quote Endpoint (Public / Mobile App)
router.post('/quote', (req: Request, res: Response) => {
  try {
    const validated = quoteRequestSchema.parse(req.body);
    const quote = calculateServerFee({
      category: validated.category,
      weightKg: validated.weightKg,
      lengthCm: validated.lengthCm,
      widthCm: validated.widthCm,
      heightCm: validated.heightCm,
      promoCode: validated.promoCode,
    });

    res.json({
      success: true,
      quote,
      message: 'Server fee calculated successfully.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid booking parameters.',
        details: error.flatten().fieldErrors,
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to calculate fee quote.' });
  }
});

// 2. Booking Creation Endpoint (Customer)
router.post('/create', authenticate, requireRoles(['CUSTOMER']), (req: AuthRequest, res: Response) => {
  try {
    const validated = createBookingSchema.parse(req.body);

    // CRITICAL SECURITY RULE: Calculate the fee on the server!
    // Never trust a price or fee sent by the mobile app.
    const serverFee = calculateServerFee({
      category: validated.category,
      weightKg: validated.weightKg,
      lengthCm: validated.lengthCm,
      widthCm: validated.widthCm,
      heightCm: validated.heightCm,
      promoCode: validated.promoCode,
    });

    const trackingNumber = `SWIFT-${randomUUID().replace(/-/g,'').slice(0,16).toUpperCase()}`;
    const parcelId = randomUUID();

    const newParcel: StoredParcel = {
      id: parcelId,
      customerId: req.user!.id,
      trackingNumber,
      status: 'CONFIRMED',
      senderName: validated.senderName,
      senderPhone: validated.senderPhone,
      pickupAddress: validated.pickupAddress,
      recipientName: validated.recipientName,
      recipientPhone: validated.recipientPhone,
      dropoffAddress: validated.dropoffAddress,
      category: serverFee.category,
      weightKg: serverFee.weightKg,
      dimensions: {
        length: validated.lengthCm,
        width: validated.widthCm,
        height: validated.heightCm,
      },
      totalFee: serverFee.totalFee, // ENFORCED SERVER-SIDE PRICE
      feeBreakdown: serverFee,
      paymentMethod: validated.paymentMethod,
      specialInstructions: validated.specialInstructions,
      estimatedPickup: 'Doorstep pickup in 15 mins',
      createdAt: new Date().toISOString(),
    };

    activeBookings.unshift(newParcel);

    res.status(201).json({
      success: true,
      message: 'Parcel booking confirmed successfully.',
      parcel: newParcel,
      parcelId: newParcel.id,
      trackingNumber: newParcel.trackingNumber,
      serverFeeEnforced: true,
      clientPriceIgnored: validated.clientFeeEstimate !== undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed for parcel booking.',
        details: error.flatten().fieldErrors,
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error while creating booking.' });
  }
});

// 3. List recent customer parcels
router.get('/list', authenticate, requireRoles(['CUSTOMER']), (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    parcels: activeBookings.filter(parcel => parcel.customerId === req.user!.id),
  });
});

return router;
}
export default createBookingRouter();
