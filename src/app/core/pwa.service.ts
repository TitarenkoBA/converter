import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);
  private installEvent: BeforeInstallPromptEvent | null = null;

  readonly online = signal(true);
  readonly canInstall = signal(false);
  readonly updateReady = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    this.online.set(navigator.onLine);
    const destroyRef = inject(DestroyRef);
    const listen = (target: EventTarget, type: string, fn: (e: Event) => void) => {
      target.addEventListener(type, fn);
      destroyRef.onDestroy(() => target.removeEventListener(type, fn));
    };

    listen(window, 'online', () => this.online.set(true));
    listen(window, 'offline', () => this.online.set(false));
    listen(window, 'beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvent = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    listen(window, 'appinstalled', () => {
      this.installEvent = null;
      this.canInstall.set(false);
    });

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((e) => e.type === 'VERSION_READY'),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe(() => this.updateReady.set(true));
    }
  }

  async install(): Promise<void> {
    if (!this.installEvent) return;
    await this.installEvent.prompt();
    await this.installEvent.userChoice;
    this.installEvent = null;
    this.canInstall.set(false);
  }

  applyUpdate(): void {
    document.location.reload();
  }
}
