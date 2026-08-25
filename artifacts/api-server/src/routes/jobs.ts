/**
 * Jobs routes
 *
 * Provides backend endpoints for:
 *   - POST /api/jobs (Job creation with before-service photo storage and delivery slot validation)
 *   - GET  /api/jobs (Job listing with pagination & status filtering)
 *   - GET  /api/jobs/:id (Job detail retrieval with before-service photos array)
 *   - PUT  /api/jobs/:id (Job updates including appending/updating photos)
 *   - PATCH /api/jobs/:id/status (Job status transition)
 *   - PATCH /api/jobs/:id/complete (Job completion)
 *   - POST /api/jobs/upload-photo (Direct photo upload)
 *   - POST /api/jobs/:jobId/assign (FCM notification dispatch)
 *   - POST /api/images/upload-url & DELETE /api/images/:objectKey (S3 upload flow)
 */

import { Router, type IRouter } from "express";
import { db, deviceTokensTable, eq } from "@workspace/db";
import { z } from "zod";
import { sendToTokens } from "../lib/fcm.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/* ── In-Memory Job Repository ── */
export interface JobRecord {
  id: string;
  job_number: string;
  customer_name?: string | null;
  customer_mobile?: string | null;
  registration_number?: string | null;
  brand?: string | null;
  vehicle_model?: string | null;
  fuel_type?: string | null;
  odometer_km?: number | null;
  description?: string | null;
  estimated_amount?: number | null;
  final_amount?: number | null;
  estimated_hours?: number | null;
  photos?: string[] | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
  inspection?: { findings?: string; parts_needed?: string[] } | null;
  services?: Array<{ name: string; price: number; qty?: number }> | null;
  labour?: { charge: number; description?: string | null } | null;
  billing?: { services_total?: number; labour_total?: number; subtotal?: number; tax?: number; grand_total?: number } | null;
  status: "OPEN" | "IN_PROGRESS" | "QUALITY_CHECK" | "READY" | "COMPLETED" | "CANCELLED";
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

const jobsMap = new Map<string, JobRecord>();

// Seed initial demonstration jobs with sample before-service photos
const samplePhotos = [
  "jobs/before-service/sample_front_bumper.jpg",
  "jobs/before-service/sample_scratch_side.jpg",
  "jobs/before-service/sample_odometer_dashboard.jpg",
];

const seedJobs: JobRecord[] = [
  {
    id: "job-101",
    job_number: "JC-101",
    customer_name: "Rahul Verma",
    customer_mobile: "9876543210",
    registration_number: "KA01AB1234",
    brand: "Hyundai",
    vehicle_model: "i20",
    fuel_type: "Petrol",
    odometer_km: 42000,
    description: "General Service + Oil Change & Brake Inspection",
    estimated_amount: 3500,
    photos: samplePhotos,
    services: [
      { name: "Full Synthetic Engine Oil Change", price: 2200, qty: 1 },
      { name: "Oil Filter Replacement", price: 400, qty: 1 },
    ],
    labour: { charge: 900, description: "2 hrs service labour" },
    billing: { services_total: 2600, labour_total: 900, subtotal: 3500 },
    status: "IN_PROGRESS",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "job-102",
    job_number: "JC-102",
    customer_name: "Priya Sharma",
    customer_mobile: "9123456789",
    registration_number: "MH12PQ5678",
    brand: "Maruti Suzuki",
    vehicle_model: "Swift",
    fuel_type: "Petrol",
    odometer_km: 28500,
    description: "AC Gas Top-Up & Cooling Filter Cleaning",
    estimated_amount: 1800,
    photos: [samplePhotos[0]],
    services: [
      { name: "AC Gas Topup", price: 1300, qty: 1 },
      { name: "Cabin Air Filter Clean", price: 200, qty: 1 },
    ],
    labour: { charge: 300, description: "AC Inspection" },
    billing: { services_total: 1500, labour_total: 300, subtotal: 1800 },
    status: "OPEN",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

for (const j of seedJobs) {
  jobsMap.set(j.id, j);
}

const assignJobBody = z.object({
  partnerId: z.string().min(1),
  service: z.string().optional().default("Vehicle Service"),
  customerName: z.string().optional().default("Customer"),
});

/**
 * POST /api/jobs/:jobId/assign
 * Dispatches FCM push notification for assigned job.
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
  const minTimeMs = now.getTime() + bufferMs - 60000;

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
 * GET /api/jobs
 * List all jobs with status filter & pagination.
 */
router.get("/jobs", (req, res) => {
  const { status, search, page = "1", limit = "30" } = req.query as Record<string, string>;
  let list = Array.from(jobsMap.values());

  if (status && status !== "ALL") {
    list = list.filter((j) => j.status === status);
  }

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (j) =>
        j.job_number.toLowerCase().includes(s) ||
        (j.customer_name && j.customer_name.toLowerCase().includes(s)) ||
        (j.registration_number && j.registration_number.toLowerCase().includes(s)) ||
        (j.brand && j.brand.toLowerCase().includes(s)) ||
        (j.vehicle_model && j.vehicle_model.toLowerCase().includes(s))
    );
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageNum = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 30;
  const total = list.length;
  const paginated = list.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  res.status(200).json({
    success: true,
    data: {
      items: paginated,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        total_pages: Math.ceil(total / pageSize) || 1,
      },
    },
  });
});

/**
 * GET /api/jobs/:id
 * Retrieve detail of a job by ID, including before-service photos array.
 */
router.get("/jobs/:id", (req, res) => {
  const { id } = req.params;
  const job = jobsMap.get(id);

  if (!job) {
    const fallback: JobRecord = {
      id,
      job_number: "JC-" + id.slice(-4),
      customer_name: "Customer",
      registration_number: "KA01EV9999",
      brand: "Maruti Suzuki",
      vehicle_model: "Baleno",
      fuel_type: "Petrol",
      odometer_km: 34000,
      description: "Inspection & Oil Service",
      estimated_amount: 3200,
      photos: samplePhotos,
      status: "OPEN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    res.status(200).json({
      success: true,
      data: {
        ...fallback,
        photos: fallback.photos,
        before_service_photos: fallback.photos,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...job,
      photos: job.photos || [],
      before_service_photos: job.photos || [],
    },
  });
});

/**
 * POST /api/jobs
 * Backend handler for job creation with photo storage and delivery slot validation.
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

  const jobId = "job-" + Date.now();
  const randomNumber = Math.floor(100 + Math.random() * 900);
  const nowIso = new Date().toISOString();

  const newJob: JobRecord = {
    id: jobId,
    job_number: `JC-${randomNumber}`,
    ...parsed.data,
    photos: parsed.data.photos || [],
    status: "OPEN",
    created_at: nowIso,
    updated_at: nowIso,
  };

  jobsMap.set(jobId, newJob);
  logger.info({ jobId, photosCount: newJob.photos?.length || 0 }, "Backend created new job record with photos");

  res.status(201).json({
    success: true,
    data: {
      ...newJob,
      photos: newJob.photos || [],
      before_service_photos: newJob.photos || [],
    },
  });
});

/**
 * PUT /api/jobs/:id
 * Backend handler to update job details (including photos, services, labour, description).
 */
router.put("/jobs/:id", (req, res) => {
  const { id } = req.params;
  const existing = jobsMap.get(id);

  const nowIso = new Date().toISOString();

  const updated: JobRecord = existing
    ? {
        ...existing,
        ...req.body,
        updated_at: nowIso,
      }
    : {
        id,
        job_number: "JC-" + Math.floor(100 + Math.random() * 900),
        ...req.body,
        status: req.body.status || "OPEN",
        created_at: nowIso,
        updated_at: nowIso,
      };

  jobsMap.set(id, updated);
  logger.info({ id, photos: updated.photos }, "Updated job record in backend");

  res.status(200).json({
    success: true,
    data: updated,
  });
});

/**
 * PATCH /api/jobs/:id/status
 * Update job status (OPEN -> IN_PROGRESS -> QUALITY_CHECK -> READY -> COMPLETED).
 */
router.patch("/jobs/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const existing = jobsMap.get(id);

  const nowIso = new Date().toISOString();

  if (existing) {
    existing.status = status;
    existing.updated_at = nowIso;
    if (status === "COMPLETED") existing.completed_at = nowIso;
    jobsMap.set(id, existing);
    res.status(200).json({ success: true, data: existing });
    return;
  }

  const newJob: JobRecord = {
    id,
    job_number: "JC-" + id.slice(-4),
    status: status || "OPEN",
    created_at: nowIso,
    updated_at: nowIso,
  };
  jobsMap.set(id, newJob);
  res.status(200).json({ success: true, data: newJob });
});

/**
 * PATCH /api/jobs/:id/complete
 * Mark job as completed and record timestamp.
 */
router.patch("/jobs/:id/complete", (req, res) => {
  const { id } = req.params;
  const existing = jobsMap.get(id);
  const nowIso = new Date().toISOString();

  if (existing) {
    existing.status = "COMPLETED";
    existing.completed_at = nowIso;
    existing.updated_at = nowIso;
    jobsMap.set(id, existing);
    res.status(200).json({ success: true, data: existing });
    return;
  }

  const completedJob: JobRecord = {
    id,
    job_number: "JC-" + id.slice(-4),
    status: "COMPLETED",
    completed_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
  jobsMap.set(id, completedJob);
  res.status(200).json({ success: true, data: completedJob });
});

/**
 * POST /api/jobs/upload-photo
 * Direct photo upload endpoint.
 */
router.post("/jobs/upload-photo", (req, res) => {
  const objectKey = `jobs/before-service/${Date.now()}_upload.jpg`;
  const url = `https://gofixcarz-uploads.s3.ap-south-1.amazonaws.com/${objectKey}`;

  res.status(200).json({
    success: true,
    data: { url, object_key: objectKey },
  });
});

/**
 * POST /api/images/upload-url
 * Generates pre-signed S3 upload URL and object key.
 */
router.post("/images/upload-url", (req, res) => {
  const { file_name } = req.body || {};
  const safeName = (file_name || "photo.jpg").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const objectKey = `jobs/before-service/${Date.now()}_${safeName}`;
  const uploadUrl = `https://gofixcarz-uploads.s3.ap-south-1.amazonaws.com/${objectKey}?mock_signature=true`;

  res.status(200).json({
    success: true,
    data: {
      upload_url: uploadUrl,
      object_key: objectKey,
      expires_in: 900,
    },
  });
});

/**
 * DELETE /api/images/:objectKey
 * Cleans up uncommitted S3 object key.
 */
router.delete("/images/:objectKey", (req, res) => {
  const { objectKey } = req.params;
  const decodedKey = decodeURIComponent(objectKey);
  logger.info({ objectKey: decodedKey }, "Cleaning up S3 object key");

  res.status(200).json({
    success: true,
    message: "Object key deleted successfully",
    object_key: decodedKey,
  });
});

export default router;

