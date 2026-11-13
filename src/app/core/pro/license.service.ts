import { Injectable, computed, isDevMode, signal } from '@angular/core';
import { storage } from '../storage';
import { PLAN_LIMITS, Plan } from './features';
import { verifyLicenseKey } from './license-verify';

const LICENSE_KEY = 'converter.license';
const DEV_PRO_KEY = 'converter.devPro';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private readonly licenseKey = signal<string | null>(null);
  private readonly devPro = signal(isDevMode() && storage.get(DEV_PRO_KEY) === '1');

  readonly plan = computed<Plan>(() => (this.devPro() || this.licenseKey() ? 'pro' : 'free'));
  readonly isPro = computed(() => this.plan() === 'pro');
  readonly limits = computed(() => PLAN_LIMITS[this.plan()]);
  readonly devMode = isDevMode();

  constructor() {
    const stored = storage.get(LICENSE_KEY);
    if (stored) {
      void verifyLicenseKey(stored).then((ok) => (ok ? this.licenseKey.set(stored) : storage.set(LICENSE_KEY, null)));
    }
  }

  async activate(key: string): Promise<boolean> {
    const trimmed = key.trim();
    if (!trimmed || !(await verifyLicenseKey(trimmed))) return false;
    storage.set(LICENSE_KEY, trimmed);
    this.licenseKey.set(trimmed);
    return true;
  }

  deactivate(): void {
    storage.set(LICENSE_KEY, null);
    this.licenseKey.set(null);
  }

  /** Dev builds only: lets batch mode be tested before payments exist. */
  setDevPro(on: boolean): void {
    if (!isDevMode()) return;
    storage.set(DEV_PRO_KEY, on ? '1' : null);
    this.devPro.set(on);
  }
}
