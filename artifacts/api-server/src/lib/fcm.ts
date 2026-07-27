/**
 * FCM push-notification dispatch helper.
 *
 * Uses the firebase-admin SDK (v14 modular API) to send messages to specific
 * device tokens.
 *
 * Requires three environment variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (the raw PEM value, newlines as \n)
 *
 * When the variables are missing the module initialises in "dry-run" mode:
 * sendToToken() logs a warning and returns a fake message-id instead of throwing.
 */

import { initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { logger } from "./logger.js";

let firebaseApp: App | null = null;

function getApp(): App | null {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      "FCM not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
        "FIREBASE_PRIVATE_KEY to enable push delivery",
    );
    return null;
  }

  firebaseApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return firebaseApp;
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single device token.
 * Returns the FCM message ID on success.
 * In dry-run mode (no credentials) it logs and returns a placeholder string.
 */
export async function sendToToken(
  token: string,
  payload: FcmPayload,
): Promise<string> {
  const app = getApp();

  if (!app) {
    const dryRunId = `dry-run-${Date.now()}`;
    logger.info(
      { token: token.slice(0, 12) + "…", payload, dryRunId },
      "FCM dry-run: would have sent notification",
    );
    return dryRunId;
  }

  const message: Message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: { sound: "default", contentAvailable: true },
      },
    },
  };

  const messageId = await getMessaging(app).send(message);
  logger.info(
    { token: token.slice(0, 12) + "…", messageId },
    "FCM message sent",
  );
  return messageId;
}

/**
 * Send the same notification to multiple tokens.
 * Failures for individual tokens are logged but do not throw.
 */
export async function sendToTokens(
  tokens: string[],
  payload: FcmPayload,
): Promise<void> {
  await Promise.all(
    tokens.map((t) =>
      sendToToken(t, payload).catch((err: unknown) => {
        logger.error({ err, token: t.slice(0, 12) + "…" }, "FCM send failed");
      }),
    ),
  );
}
