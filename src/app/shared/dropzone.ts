import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { I18n } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-500"
      [class]="
        dragging()
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
          : 'border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900'
      "
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <input type="file" class="sr-only" [accept]="accept()" [multiple]="multiple()" (change)="onPick($event)" />
      <svg class="size-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
      <span class="text-lg font-medium">{{ i18n.t(multiple() ? 'drop.titleMany' : 'drop.title') }}</span>
      <span class="text-sm text-slate-500">{{ i18n.t('drop.or') }}</span>
      <span class="btn btn-primary">{{ i18n.t(multiple() ? 'drop.browseMany' : 'drop.browse') }}</span>
      <span class="mt-2 text-xs text-slate-500">{{ i18n.t('drop.hint', { format: formatLabel() }) }}</span>
    </label>
  `,
})
export class Dropzone {
  protected readonly i18n = inject(I18n);

  readonly accept = input.required<string>();
  readonly formatLabel = input.required<string>();
  readonly multiple = input(false);
  readonly files = output<File[]>();

  protected readonly dragging = signal(false);

  protected onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.files.emit(files);
  }

  protected onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // allow picking the same file again
    if (files.length) this.files.emit(files);
  }
}
