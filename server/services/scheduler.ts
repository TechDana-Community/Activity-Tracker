import { StudentRepository } from '../db';
import { SyncCoordinator } from './sync';

export interface BackgroundSchedulerHandle {
  stop: () => void;
  intervalMs: number;
}

/**
 * Starts the periodic background sync worker using Node's native timer.
 * Utilizes .unref() so background execution does not prevent graceful process termination.
 */
export function startBackgroundSync(
  repo: StudentRepository,
  coordinator: SyncCoordinator,
  intervalMs?: number
): BackgroundSchedulerHandle {
  // Default to 1 hour (or environment configuration)
  const defaultIntervalHours = parseFloat(process.env.SYNC_INTERVAL_HOURS || '1');
  const actualIntervalMs = intervalMs || (defaultIntervalHours * 60 * 60 * 1000);

  const timer = setInterval(async () => {
    try {
      console.log('[Background Scheduler] Initiating scheduled cohort synchronization...');
      const stats = await coordinator.syncAll(repo, { isManual: false });
      console.log(
        `[Background Scheduler] Completed scheduled sync: ${stats.updated}/${stats.total} updated (${stats.failed} failed) in ${stats.durationMs}ms`
      );
    } catch (err: unknown) {
      console.error('[Background Scheduler] Periodic sync cycle encountered an error:', err);
    }
  }, actualIntervalMs);

  // Unref timer so that Node.js process can exit cleanly during shutdown or unit tests
  timer.unref();

  return {
    stop: () => {
      clearInterval(timer);
    },
    intervalMs: actualIntervalMs
  };
}
