import { Decimal } from "@prisma/client/runtime/library";

// Type definition for SubscriptionTier
type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "ELITE";

/**
 * Commission Rates & Subscription Pricing
 * Based on Eterna Business Model
 */

export const SUBSCRIPTION_PRICING = {
  FREE: 0,
  BASIC: 1000, // KES 1,000/month
  PRO: 3000, // KES 3,000/month
  ELITE: 7500, // KES 5,000-10,000/month (average)
};

export const COMMISSION_RATES = {
  platformFeePercent: 3, // 3% per order
  platformFeeMin: 100, // Minimum KES 100
  platformFeeMax: 200, // Maximum KES 200
  deliveryMarginMin: 50, // KES 50 minimum per delivery
  deliveryMarginMax: 150, // KES 150 maximum per delivery
};

export interface CommissionBreakdown {
  subtotal: number;
  platformFee: number;
  deliveryFee: number;
  sellerPayout: number;
  escrowAmount: number;
}

/**
 * Calculate platform fee based on order subtotal
 * @param subtotal Order subtotal in KES
 * @returns Platform fee amount
 */
export function calculatePlatformFee(subtotal: number): number {
  const percentageBasedFee = subtotal * (COMMISSION_RATES.platformFeePercent / 100);
  
  // Apply min/max bounds
  if (percentageBasedFee < COMMISSION_RATES.platformFeeMin) {
    return COMMISSION_RATES.platformFeeMin;
  }
  if (percentageBasedFee > COMMISSION_RATES.platformFeeMax) {
    return COMMISSION_RATES.platformFeeMax;
  }
  
  return Math.round(percentageBasedFee);
}

/**
 * Calculate delivery margin based on distance/complexity (simplified)
 * @param deliveryFee Buyer's delivery fee
 * @returns Eterna's margin from delivery
 */
export function calculateDeliveryMargin(deliveryFee: number): number {
  // Take 30-50% of delivery fee as margin (configurable per logistics partner)
  const margin = deliveryFee * 0.4; // 40% margin
  
  if (margin < COMMISSION_RATES.deliveryMarginMin) {
    return COMMISSION_RATES.deliveryMarginMin;
  }
  if (margin > COMMISSION_RATES.deliveryMarginMax) {
    return COMMISSION_RATES.deliveryMarginMax;
  }
  
  return Math.round(margin);
}

/**
 * Calculate all commissions for an order
 * @param subtotal Seller's order subtotal
 * @param deliveryFee Delivery fee (paid by buyer)
 * @returns Commission breakdown
 */
export function calculateOrderCommissions(
  subtotal: number,
  deliveryFee: number
): CommissionBreakdown {
  const platformFee = calculatePlatformFee(subtotal);
  const deliveryMargin = calculateDeliveryMargin(deliveryFee);
  
  // Total charged from buyer = subtotal + deliveryFee
  const totalChargedToBuyer = subtotal + deliveryFee;
  
  // Escrow amount = what buyer pays
  const escrowAmount = totalChargedToBuyer;
  
  // Seller payout = subtotal - platform fee
  const sellerPayout = subtotal - platformFee;
  
  // Eterna earnings = platform fee + delivery margin
  // (delivery margin already deducted from deliveryFee)
  
  return {
    subtotal,
    platformFee,
    deliveryFee,
    sellerPayout,
    escrowAmount,
  };
}

/**
 * Calculate monthly earnings for a seller
 */
export interface SellerEarnings {
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  totalPayout: number;
  averageOrderValue: number;
  subscriptionCost: number;
  netEarnings: number;
}

export function calculateSellerEarnings(
  orders: Array<{
    subtotal: number;
    platformFee: number;
    sellerPayout: number;
  }>,
  subscriptionTier: SubscriptionTier
): SellerEarnings {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalCommissions = orders.reduce((sum, o) => sum + o.platformFee, 0);
  const totalPayout = orders.reduce((sum, o) => sum + o.sellerPayout, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const subscriptionCost = SUBSCRIPTION_PRICING[subscriptionTier];
  const netEarnings = totalPayout - subscriptionCost;

  return {
    totalOrders,
    totalRevenue,
    totalCommissions,
    totalPayout,
    averageOrderValue,
    subscriptionCost,
    netEarnings,
  };
}

/**
 * Get subscription tier recommendations based on order volume
 */
export function getSubscriptionRecommendation(monthlyOrders: number): SubscriptionTier {
  if (monthlyOrders < 5) return "FREE";
  if (monthlyOrders < 20) return "BASIC";
  if (monthlyOrders < 50) return "PRO";
  return "ELITE";
}

/**
 * Calculate subscription ROI
 */
export function calculateSubscriptionROI(
  tier: SubscriptionTier,
  monthlyOrders: number,
  averageOrderValue: number
): {
  cost: number;
  avgEarningsPerOrder: number;
  monthlyEarnings: number;
  roi: number; // percentage
} {
  const cost = SUBSCRIPTION_PRICING[tier];
  const avgEarningsPerOrder = averageOrderValue * (COMMISSION_RATES.platformFeePercent / 100);
  const monthlyEarnings = avgEarningsPerOrder * monthlyOrders;
  const roi = cost > 0 ? ((monthlyEarnings - cost) / cost) * 100 : 0;

  return {
    cost,
    avgEarningsPerOrder,
    monthlyEarnings,
    roi,
  };
}
