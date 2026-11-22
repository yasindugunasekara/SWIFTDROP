import { mobileApiFetch } from './api';

export interface FeeQuoteRequest {
  pickupAddress: string;
  dropoffAddress: string;
  weightKg: number;
  category?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  promoCode?: string;
}

export interface FeeQuoteResponse {
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

export interface CreateBookingRequest {
  pickupAddress: string;
  dropoffAddress: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  weightKg: number;
  category?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  specialInstructions?: string;
  paymentMethod: 'wallet' | 'card' | 'cod';
  promoCode?: string;
  clientFeeEstimate?: number;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  parcel: {
    id: string;
    trackingNumber: string;
    status: string;
    category: string;
    weightKg: number;
    pickupAddress: string;
    dropoffAddress: string;
    totalFee: number;
    currency: string;
    paymentMethod: string;
    estimatedPickup: string;
    createdAt: string;
  };
  serverFeeEnforced: boolean;
}

/**
 * Fetch server-side dynamic fee quote for parcel booking.
 * Enforces business rules and server pricing calculation.
 */
export async function getBookingQuote(params: FeeQuoteRequest): Promise<FeeQuoteResponse> {
  const result=await mobileApiFetch('/booking/quote',{method:'POST',body:JSON.stringify(params)});
  if(!result.quote)throw new Error('A server quote is required before booking.');
  return result.quote;
}

/**
 * Create a confirmed parcel booking.
 * The server independently validates and calculates the fee.
 */
export async function createParcelBooking(payload: CreateBookingRequest): Promise<BookingResponse> {
  const result = await mobileApiFetch('/booking/create', {method:'POST',body:JSON.stringify(payload)});
  if (!result.success || !result.parcel) throw new Error('Booking could not be confirmed. Please retry.');
  return result;
}
