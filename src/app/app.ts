import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { I18n, LANGUAGES, TKey } from './core/i18n/i18n.service';
import { CONVERTERS, CONVERTER_GROUPS } from './core/image/converters';
import { FORMATS } from './core/image/formats';
import { FEATURES } from './core/pro/features';
import { LicenseService } from './core/pro/license.service';
import { PwaService } from './core/pwa.service';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly pwa = inject(PwaService);
  protected readonly license = inject(LicenseService);
  protected readonly theme = inject(ThemeService);
  protected readonly features = FEATURES;
  protected readonly languages = LANGUAGES;
  protected readonly converters = CONVERTERS;
  protected readonly groups = CONVERTER_GROUPS;
  protected readonly formats = FORMATS;

  protected readonly isLanding = computed(() => this.i18n.page() === '');
  protected readonly themeLabel = computed<TKey>(() => `theme.${this.theme.mode()}`);
}
