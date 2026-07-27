/**
 * Notification routes
 *
 * POST /api/notifications/device-token
 *   Registers (or refreshes) a device push token for the authenticated partner.
 *   Uses an upsert so re-registrations and token rotations are handled cleanly.
 *
 * POST /api/notifications/test
 *   Sends a test push notification to all tokens registered for the
 *   authenticated partner. Useful for verifying end-to-end FCM delivery.
 */

import { Router, type IRouter } from "express";
import { db, deviceTokensTable, eq } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { sendToTokens } from "../lib/fcm.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────────────────────

const registerTokenBody = z.object({
  token: z.string().min(1, "token is required"),
  platform: z.enum(["android", "ios"], {
    errorMap: () => ({ message: "platform must be 'android' or 'ios'" }),
  }),
});

// ──────────────────────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/notifications/device-token
 *
 * Body: { token: string; platform: 'android' | 'ios' }
 *
 * Upserts the device token for the authenticated partner.
 * If the token already exists (e.g. re-install), updates the partner association
 * and resets the updatedAt timestamp.
 */
router.post(
  "/notifications/device-token",
  requireAuth,
  async (req, res) => {
    const parsed = registerTokenBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { token, platform } = parsed.data;
    const partnerId = req.partnerId!;

    try {
      await db
        .insert(deviceTokensTable)
        .values({ partnerId, token, platform })
        .onConflictDoUpdate({
          target: deviceTokensTable.token,
          set: {
            partnerId,
            platform,
            updatedAt: new Date(),
          },
        });

      logger.info(
        { partnerId, platform, token: token.slice(0, 12) + "…" },
        "Device token registered",
      );

      res.status(200).json({ success: true, message: "Token registered" });
    } catch (err) {
      logger.error({ err, partnerId }, "Failed to register device token");
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
);

/**
 * POST /api/notifications/test
 *
 * Sends a test notification to every device token the authenticated partner
 * has registered. Confirms end-to-end FCM delivery.
 */
router.post(
  "/notifications/test",
  requireAuth,
  async (req, res) => {
    const partnerId = req.partnerId!;

    try {
      const rows = await db
        .select()
        .from(deviceTokensTable)
        .where(eq(deviceTokensTable.partnerId, partnerId));

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "No device tokens registered for this partner",
        });
        return;
      }

      const tokens = rows.map((r) => r.token);

      await sendToTokens(tokens, {
        title: "GoFixCarz",
        body: "🔔 Test notification — your device is set up correctly!",
        data: { type: "test", partnerId },
      });

      res.status(200).json({
        success: true,
        message: `Notification dispatched to ${tokens.length} device(s)`,
        tokenCount: tokens.length,
      });
    } catch (err) {
      logger.error({ err, partnerId }, "Failed to send test notification");
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
);

/**
 * GET /api/notifications/device-token
 *
 * Returns the device tokens registered for the authenticated partner.
 * Useful for debugging and confirming persistence.
 */
router.get(
  "/notifications/device-token",
  requireAuth,
  async (req, res) => {
    const partnerId = req.partnerId!;

    try {
      const rows = await db
        .select({
          id: deviceTokensTable.id,
          platform: deviceTokensTable.platform,
          tokenPrefix: deviceTokensTable.token,
          createdAt: deviceTokensTable.createdAt,
          updatedAt: deviceTokensTable.updatedAt,
        })
        .from(deviceTokensTable)
        .where(eq(deviceTokensTable.partnerId, partnerId));

      // Return a masked token so it's visible enough to debug but not exposing
      // the full raw token in logs / network traffic
      const result = rows.map((r) => ({
        ...r,
        tokenPrefix: r.tokenPrefix.slice(0, 20) + "…",
      }));

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      logger.error({ err, partnerId }, "Failed to fetch device tokens");
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
);

export default router;
