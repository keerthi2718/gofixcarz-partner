/**
 * Jobs routes (stub)
 *
 * Demonstrates how a job-assignment event triggers FCM push notifications.
 *
 * POST /api/jobs/:jobId/assign
 *   Assigns a job to a partner and sends an FCM "new job" notification
 *   to every device token registered for that partner.
 */

import { Router, type IRouter } from "express";
import { db, deviceTokensTable, eq } from "@workspace/db";
import { z } from "zod";
import { sendToTokens } from "../lib/fcm.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const assignJobBody = z.object({
  /** ID of the partner receiving the job */
  partnerId: z.string().min(1),
  /** Human-readable job details */
  service: z.string().optional().default("Vehicle Service"),
  customerName: z.string().optional().default("Customer"),
});

/**
 * POST /api/jobs/:jobId/assign
 *
 * Simulates assigning an existing job to a partner, then pushes an FCM
 * notification so the partner's app receives the new-job alert in real time.
 *
 * In a full implementation this would also write to a jobs table and enforce
 * auth. Here it focuses purely on the FCM dispatch path so it can be exercised
 * without a complete job-management schema.
 */
router.post("/jobs/:jobId/assign", async (req, res) => {
  const { jobId } = req.params as { jobId: string };

  const parsed = assignJobBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { partnerId, service, customerName } = parsed.data;

  // 1. Retrieve all device tokens for the target partner
  const rows = await db
    .select()
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.partnerId, partnerId));

  if (rows.length === 0) {
    logger.warn(
      { partnerId, jobId },
      "No device tokens found for partner — notification not sent",
    );
    res.status(200).json({
      success: true,
      notified: false,
      reason: "No device tokens registered for partner",
    });
    return;
  }

  const tokens = rows.map((r) => r.token);

  // 2. Dispatch FCM notification
  await sendToTokens(tokens, {
    title: "New Job Assigned 🔧",
    body: `${service} request from ${customerName}. Tap to view details.`,
    data: {
      type: "job_assigned",
      jobId,
      partnerId,
    },
  });

  logger.info(
    { jobId, partnerId, tokenCount: tokens.length },
    "Job assignment notification dispatched",
  );

  res.status(200).json({
    success: true,
    notified: true,
    tokenCount: tokens.length,
    jobId,
    partnerId,
  });
});

export default router;
