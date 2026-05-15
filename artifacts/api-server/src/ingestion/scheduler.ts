import { ingestAllActive } from "./index";
import { logger } from "../lib/logger";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

let started = false;

/**
 * Boot a lightweight in-process scheduler. For production-grade reliability
 * this should be moved to an external cron / a managed scheduler — the
 * functions are designed to be idempotent so either approach works.
 */
export function startIngestionScheduler() {
  if (started) return;
  started = true;

  const intervalMs = Number(process.env["INGESTION_INTERVAL_MS"] ?? FOUR_HOURS_MS);
  const runOnBoot = process.env["INGESTION_RUN_ON_BOOT"] === "true";

  logger.info({ intervalMs, runOnBoot }, "Ingestion scheduler armed");

  if (runOnBoot) {
    setTimeout(() => {
      ingestAllActive().catch(err => logger.error({ err }, "Boot ingestion failed"));
    }, 5_000);
  }

  setInterval(() => {
    ingestAllActive().catch(err => logger.error({ err }, "Scheduled ingestion failed"));
  }, intervalMs).unref();
}
