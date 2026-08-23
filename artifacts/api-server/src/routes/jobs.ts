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

  const tokens = rows.map((r: { token: string }) => r.token);

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

/**
 * Backend delivery date & time slot validation function.
 * Enforces that delivery date and pickup time slot are not in the past.
 */
export function validateDeliverySlotBackend(
  deliveryDateStr?: string | null,
  deliveryTimeStr?: string | null,
  estimatedHours?: number | null
): { valid: boolean; error?: string } {
  if (!deliveryDateStr || !deliveryTimeStr) return { valid: true };

  const deliveryDate = new Date(deliveryDateStr);
  const deliveryTime = new Date(deliveryTimeStr);

  if (isNaN(deliveryDate.getTime()) || isNaN(deliveryTime.getTime())) {
    return { valid: true };
  }

  const now = new Date();
  const isToday =
    deliveryDate.getFullYear() === now.getFullYear() &&
    deliveryDate.getMonth() === now.getMonth() &&
    deliveryDate.getDate() === now.getDate();

  const bufferMs = Math.max(0, estimatedHours ?? 0) * 3600 * 1000;
  const minTimeMs = now.getTime() + bufferMs - 60000; // 1 min grace buffer

  if (isToday) {
    if (deliveryTime.getTime() < minTimeMs) {
      const hoursInfo = estimatedHours && estimatedHours > 0 ? ` (including ${estimatedHours} hrs estimated service time)` : '';
      return {
        valid: false,
        error: `Selected delivery/pickup time slot is earlier than required service completion time${hoursInfo}. Please select a valid future time slot.`,
      };
    }
  } else {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDelivery = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
    if (startOfDelivery.getTime() < startOfToday.getTime()) {
      return {
        valid: false,
        error: "Selected delivery date is in the past. Please select today or a future date.",
      };
    }
  }

  return { valid: true };
}

const createJobPayloadSchema = z.object({
  customer_name: z.string().optional().nullable(),
  customer_mobile: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  vehicle_model: z.string().optional().nullable(),
  fuel_type: z.string().optional().nullable(),
  odometer_km: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  estimated_amount: z.number().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  delivery_time: z.string().optional().nullable(),
});

/**
 * POST /api/jobs
 * Backend handler for job creation with delivery time slot validation.
 */
router.post("/jobs", async (req, res) => {
  const parsed = createJobPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { delivery_date, delivery_time, estimated_hours } = req.body;
  const timeValidation = validateDeliverySlotBackend(delivery_date, delivery_time, estimated_hours);
  if (!timeValidation.valid) {
    res.status(400).json({
      success: false,
      message: timeValidation.error,
      errors: { delivery_time: [timeValidation.error!] },
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: {
      id: "job-" + Date.now(),
      job_number: "JC-" + Math.floor(100 + Math.random() * 900),
      ...req.body,
      status: "OPEN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
});

export default router;
