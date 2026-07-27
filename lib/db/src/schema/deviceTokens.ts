import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Stores FCM / APNs device push tokens for authenticated partners.
 * One partner may have multiple tokens (multiple devices / reinstalls).
 * The `token` column has a unique index so re-registrations upsert in place.
 */
export const deviceTokensTable = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** ID of the partner account that owns this device */
    partnerId: text("partner_id").notNull(),
    /** Raw FCM registration token or APNs device token */
    token: text("token").notNull(),
    /** 'android' | 'ios' */
    platform: text("platform").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("device_tokens_token_idx").on(table.token)],
);

export const insertDeviceTokenSchema = createInsertSchema(
  deviceTokensTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;
export type DeviceToken = typeof deviceTokensTable.$inferSelect;
