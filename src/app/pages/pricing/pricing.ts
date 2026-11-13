import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { LicenseService } from '../../core/pro/license.service';

/** Reachable only when FEATURES.paymentsEnabled is true (see app.routes.ts). */
@Component({
  selector: 'app-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8">
      <h1 class="text-3xl font-bold tracking-tight">{{ i18n.t('pricing.title') }}</h1>

      <div class="grid gap-4 sm:grid-cols-2">
        <article class="card p-6">
          <h2 class="text-xl font-semibold">{{ i18n.t('pricing.free') }}</h2>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ i18n.t('pricing.freeDesc') }}</p>
        </article>
        <article class="card border-indigo-500 p-6">
          <h2 class="text-xl font-semibold">{{ i18n.t('pricing.pro') }}</h2>
          <p class="mt-2 text-slate-600 dark:text-slate-400">{{ i18n.t('pricing.proDesc') }}</p>
          @if (license.isPro()) {
            <p class="mt-4 font-medium text-indigo-600">{{ i18n.t('pricing.active') }}</p>
          } @else {
            <!-- TODO: checkout button once a payment provider is integrated -->
            <button type="button" class="btn btn-primary mt-4" disabled>{{ i18n.t('pricing.soon') }}</button>
          }
        </article>
      </div>

      @if (!license.isPro()) {
        <form class="card max-w-md space-y-3 p-6" (submit)="activate($event, key.value)">
          <label class="block">
            <span class="text-sm font-medium">{{ i18n.t('pricing.licenseKey') }}</span>
            <input #key class="input mt-2" autocomplete="off" spellcheck="false" />
          </label>
          <button type="submit" class="btn btn-primary">{{ i18n.t('pricing.activate') }}</button>
          @if (invalid()) {
            <p class="text-sm text-red-600">{{ i18n.t('pricing.invalidKey') }}</p>
          }
        </form>
      }
    </section>
  `,
})
export class Pricing {
  protected readonly i18n = inject(I18n);
  protected readonly license = inject(LicenseService);
  protected readonly invalid = signal(false);

  protected async activate(e: Event, key: string): Promise<void> {
    e.preventDefault();
    this.invalid.set(!(await this.license.activate(key)));
  }
}
