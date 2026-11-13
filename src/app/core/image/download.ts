export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Stored without compression: image formats are already compressed. */
export async function zipBlobs(files: readonly { name: string; blob: Blob }[]): Promise<Blob> {
  const { zipSync } = await import('fflate');
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const { name, blob } of files) {
    entries[uniqueName(name, entries)] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(entries) as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

function uniqueName(name: string, taken: Record<string, unknown>): string {
  if (!(name in taken)) return name;
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let i = 2;
  while (`${base} (${i})${ext}` in taken) i++;
  return `${base} (${i})${ext}`;
}
