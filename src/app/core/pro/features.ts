/**
 * Feature switches for the paid plan.
 *
 * `paymentsEnabled` is off until a payment provider is integrated. While off, every Pro-related
 * UI (pricing page, upgrade links, license form) is hidden, but the Pro behaviour itself
 * (batch processing, ZIP download) is fully implemented and can be tried in dev builds
 * via the "Dev: Pro" toggle in the footer.
 */
export const FEATURES = {
  paymentsEnabled: false,
} as const;

export type Plan = 'free' | 'pro';

export interface PlanLimits {
  /** Files that can be queued at once. 1 means no batch mode. */
  readonly maxFiles: number;
  readonly zipDownload: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { maxFiles: 1, zipDownload: false },
  pro: { maxFiles: 500, zipDownload: true },
};
