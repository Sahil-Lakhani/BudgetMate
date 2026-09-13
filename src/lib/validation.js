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
// type "refund" = money coming back (negative total, no line items) — e.g. a split share repaid to the payer
export const TransactionSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  location: z.string().optional(),
  total: z.coerce.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  lineItems: z.array(TransactionItemSchema).default([]),
  source: z.enum(['scan', 'manual', 'split']).default('scan'),
  type: z.enum(['expense', 'refund']).default('expense'),
  splitId: z.string().optional(),
  createdAt: z.string().optional() // Will be set by Firestore
})
  .refine((t) => t.type === 'refund' ? t.total < 0 : t.total >= 0,
    { message: 'Expenses must be non-negative; refunds must be negative', path: ['total'] })
  .refine((t) => t.type === 'refund' || t.lineItems.length >= 1,
    { message: 'At least one item is required', path: ['lineItems'] });

// User settings schema
export const UserSettingsSchema = z.object({
  currency: z.string().default('EUR'),
  language: z.string().default('en'),
  notifications: z.boolean().default(true)
}).passthrough(); // Allow additional fields

// ─── Groups & Splits ─────────────────────────────────────────────────────────

export const GroupMemberSchema = z.object({
  userId: z.string().min(1, 'Member userId is required'),
  displayName: z.string().default(''),
  email: z.string().default(''),
  photoURL: z.string().default('')
});

export const GroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(60, 'Group name is too long'),
  members: z.array(GroupMemberSchema).min(1, 'At least one member is required').max(20, 'Groups are limited to 20 members')
});

export const SplitParticipantSchema = z.object({
  userId: z.string().min(1, 'Participant userId is required'),
  displayName: z.string().default(''),
  photoURL: z.string().default(''),
  amount: z.coerce.number().nonnegative('Share must be non-negative'),
  status: z.enum(['pending', 'settled']).default('pending')
});

export const SplitSchema = z.object({
  groupId: z.string().min(1, 'groupId is required'),
  payerId: z.string().min(1, 'payerId is required'),
  merchant: z.string().trim().min(1, 'Merchant name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  totalAmount: z.coerce.number().positive('Total must be greater than zero'),
  participants: z.array(SplitParticipantSchema).min(1, 'At least one participant is required').max(20)
})
  .refine(
    (s) => Math.abs(s.participants.reduce((sum, p) => sum + p.amount, 0) - s.totalAmount) < 0.005,
    { message: 'Participant shares must add up to the total', path: ['participants'] }
  )
  .refine(
    (s) => s.participants.some((p) => p.userId === s.payerId),
    { message: 'Payer must be a participant', path: ['payerId'] }
  );

export const NotificationSchema = z.object({
  type: z.literal('split_added'),
  splitId: z.string().min(1),
  groupId: z.string().min(1),
  groupName: z.string().default(''),
  payerName: z.string().default(''),
  merchant: z.string().default(''),
  amount: z.coerce.number().nonnegative()
});

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

export function validateGroup(data) {
  return GroupSchema.parse(data);
}

export function validateSplit(data) {
  return SplitSchema.parse(data);
}

export function validateNotification(data) {
  return NotificationSchema.parse(data);
}
