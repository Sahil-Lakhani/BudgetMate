import { z } from 'zod';

// Transaction item schema — flexible to match both manual and scan paths
export const TransactionItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().default('Other'),
  quantity: z.coerce.number().positive('Quantity must be positive').default(1),
  price: z.coerce.number().nonnegative('Price must be non-negative'),
  totalPrice: z.coerce.number().nonnegative().optional()
});

// Receipt schema (from Gemini analysis) — kept for reference, not enforced on save
export const ReceiptSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  location: z.string().optional(),
  total: z.coerce.number().nonnegative('Total must be non-negative'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  lineItems: z.array(TransactionItemSchema).min(1, 'At least one item is required')
});

// Transaction schema (for Firestore storage)
export const TransactionSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  location: z.string().optional(),
  total: z.coerce.number().nonnegative('Total must be non-negative'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  lineItems: z.array(TransactionItemSchema).min(1, 'At least one item is required'),
  source: z.enum(['scan', 'manual']).default('scan'),
  createdAt: z.string().optional() // Will be set by Firestore
});

// User settings schema
export const UserSettingsSchema = z.object({
  currency: z.string().default('EUR'),
  language: z.string().default('en'),
  notifications: z.boolean().default(true)
}).passthrough(); // Allow additional fields

// Validation helper functions
export function validateReceipt(data) {
  return ReceiptSchema.parse(data);
}

export function validateTransaction(data) {
  return TransactionSchema.parse(data);
}

export function validateUserSettings(data) {
  return UserSettingsSchema.parse(data);
}
