import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TKey } from '../../core/i18n/i18n.service';
import { ConvertError, ConvertOptions, ICO_SIZES, MAX_SVG_WIDTH, canEncode, convertImage } from '../../core/image/convert';
import { CONVERTERS, ConverterDef } from '../../core/image/converters';
import { SITE_NAME, Seo, absoluteUrl } from '../../core/seo.service';
import { saveBlob, zipBlobs } from '../../core/image/download';
import { FORMATS, acceptAttr, matchesFormat, outputName } from '../../core/image/formats';
import { LicenseService } from '../../core/pro/license.service';
import { Dropzone } from '../../shared/dropzone';

type JobStatus = 'pending' | 'working' | 'done' | 'error';

interface Job {
  readonly id: number;
  readonly file: File;
  readonly outName: string;
  readonly status: JobStatus;
  readonly result?: Blob;
  readonly url?: string;
  readonly error?: TKey;
}

interface Notice {
  readonly key: TKey;
  readonly params?: Record<string, string | number>;
}

let nextJobId = 1;

@Component({
  selector: 'app-converter-page',
  imports: [Dropzone, RouterLink],
  templateUrl: './converter-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:paste)': 'onPaste($event)' },
})
export class ConverterPage {
  /** Bound from route data. */
  readonly converter = input.required<ConverterDef>();

  protected readonly i18n = inject(I18n);
  protected readonly license = inject(LicenseService);

  protected readonly from = computed(() => FORMATS[this.converter().from]);
  protected readonly to = computed(() => FORMATS[this.converter().to]);
  protected readonly accept = computed(() => acceptAttr(this.from()));
  protected readonly encodeSupported = computed(() => canEncode(this.to().id));
  protected readonly batch = computed(() => this.license.limits().maxFiles > 1);

  protected readonly icoSizeChoices = ICO_SIZES;
  protected readonly maxSvgWidth = MAX_SVG_WIDTH;
  protected readonly qualityDraft = signal(90);
  private readonly quality = signal(90);
  protected readonly background = signal('#ffffff');
  protected readonly icoSizes = signal<readonly number[]>([16, 32, 48, 256]);
  protected readonly svgWidth = signal<number | null>(null);

  protected readonly hasOptions = computed(
    () => this.to().lossy || !this.to().alpha || this.to().id === 'ico' || this.from().id === 'svg',
  );

  private readonly options = computed<ConvertOptions>(() => ({
    quality: this.quality() / 100,
    background: this.background(),
    icoSizes: this.icoSizes(),
    svgWidth: this.svgWidth(),
  }));

  protected readonly jobs = signal<readonly Job[]>([]);
  protected readonly doneJobs = computed(() => this.jobs().filter((j) => j.status === 'done'));
  protected readonly notice = signal<Notice | null>(null);
  protected readonly zipping = signal(false);

  /** Bumped when options change so in-flight results from old options are dropped. */
  private generation = 0;
  private processing = false;

  /** Same source or same target format, for internal linking. */
  protected readonly related = computed(() => {
    const { slug, from, to } = this.converter();
    return CONVERTERS.filter((c) => c.slug !== slug && (c.from === from || c.to === to));
  });

  protected readonly aboutFormats = computed(() => [this.from(), this.to()]);
  protected readonly formats = FORMATS;

  constructor() {
    const seo = inject(Seo);
    effect(() => {
      const params = { from: this.from().label, to: this.to().label };
      const t = (k: TKey) => this.i18n.t(k, params);
      const url = absoluteUrl(this.i18n.path(this.converter().slug));
      seo.update({
        title: t('seo.converter.title'),
        description: t('seo.converter.description'),
        page: this.converter().slug,
        jsonLd: [
          {
            '@type': 'WebApplication',
            name: t('converter.title'),
            url,
            description: t('seo.converter.description'),
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            inLanguage: this.i18n.lang(),
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl(this.i18n.path('')) },
              { '@type': 'ListItem', position: 2, name: `${params.from} → ${params.to}`, item: url },
            ],
          },
        ],
      });
    });

    effect(() => {
      this.options();
      untracked(() => this.reconvertAll());
    });

    inject(DestroyRef).onDestroy(() => this.jobs().forEach(revoke));
  }

  protected addFiles(files: File[]): void {
    const valid = files.filter((f) => matchesFormat(f, this.from()));
    const skipped = files.length - valid.length;
    this.notice.set(skipped ? { key: 'msg.wrongType', params: { count: skipped, format: this.from().label } } : null);
    if (!valid.length) return;

    const { maxFiles } = this.license.limits();
    if (maxFiles === 1) {
      if (valid.length > 1) this.notice.set({ key: 'msg.singleOnly' });
      this.clear();
      this.jobs.set([this.createJob(valid[0])]);
    } else {
      const room = maxFiles - this.jobs().length;
      if (valid.length > room) this.notice.set({ key: 'msg.limit', params: { max: maxFiles } });
      this.jobs.update((jobs) => [...jobs, ...valid.slice(0, Math.max(0, room)).map((f) => this.createJob(f))]);
    }
    void this.process();
  }

  protected onPaste(e: ClipboardEvent): void {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (!files.length) return;
    e.preventDefault();
    this.addFiles(files);
  }

  protected remove(job: Job): void {
    revoke(job);
    this.jobs.update((jobs) => jobs.filter((j) => j.id !== job.id));
  }

  protected clear(): void {
    this.jobs().forEach(revoke);
    this.jobs.set([]);
  }

  protected async downloadAll(): Promise<void> {
    this.zipping.set(true);
    try {
      const files = this.doneJobs().map((j) => ({ name: j.outName, blob: j.result! }));
      saveBlob(await zipBlobs(files), `converted-${this.to().id}.zip`);
    } finally {
      this.zipping.set(false);
    }
  }

  protected commitQuality(e: Event): void {
    this.quality.set(+(e.target as HTMLInputElement).value);
  }

  protected setBackground(e: Event): void {
    this.background.set((e.target as HTMLInputElement).value);
  }

  protected toggleIcoSize(size: number): void {
    this.icoSizes.update((sizes) => (sizes.includes(size) ? sizes.filter((s) => s !== size) : [...sizes, size]));
  }

  protected setSvgWidth(e: Event): void {
    const input = e.target as HTMLInputElement;
    const n = Math.round(+input.value);
    const width = input.value && n > 0 ? Math.min(n, MAX_SVG_WIDTH) : null;
    input.value = width ? String(width) : '';
    this.svgWidth.set(width);
  }

  protected statusKey(status: JobStatus): TKey {
    return `job.${status}`;
  }

  protected formatKey(id: string): TKey {
    return `format.${id}` as TKey;
  }

  private createJob(file: File): Job {
    return { id: nextJobId++, file, outName: outputName(file, this.to()), status: 'pending' };
  }

  private patch(id: number, changes: Partial<Job>): void {
    this.jobs.update((jobs) => jobs.map((j) => (j.id === id ? { ...j, ...changes } : j)));
  }

  private reconvertAll(): void {
    if (!this.jobs().length) return;
    this.generation++;
    this.jobs.update((jobs) =>
      jobs.map((j) => {
        revoke(j);
        return { id: j.id, file: j.file, outName: j.outName, status: 'pending' };
      }),
    );
    void this.process();
  }

  /** Sequential queue: keeps memory bounded for large batches. */
  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      for (let job = this.nextPending(); job; job = this.nextPending()) {
        const generation = this.generation;
        this.patch(job.id, { status: 'working' });
        try {
          const result = await convertImage(job.file, this.converter(), this.options());
          if (generation !== this.generation || !this.exists(job.id)) continue;
          this.patch(job.id, { status: 'done', result, url: URL.createObjectURL(result) });
        } catch (err) {
          if (generation !== this.generation || !this.exists(job.id)) continue;
          console.error(err);
          const decode = err instanceof ConvertError && err.code === 'decode';
          this.patch(job.id, { status: 'error', error: decode ? 'msg.decodeFailed' : 'msg.encodeFailed' });
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private nextPending(): Job | undefined {
    return this.jobs().find((j) => j.status === 'pending');
  }

  private exists(id: number): boolean {
    return this.jobs().some((j) => j.id === id);
  }
}

function revoke(job: Job): void {
  if (job.url) URL.revokeObjectURL(job.url);
}
