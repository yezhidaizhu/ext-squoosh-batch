import { createZipBlob, type ZipEntry } from './zip';

export type SquooshAutoZipItem = {
  id: string;
  file: File;
};

export type SquooshAutoZipProgress = {
  index: number;
  total: number;
  phase: 'loading' | 'waiting' | 'collecting' | 'zipping';
  filename?: string;
};

type RunSquooshAutoZipOptions<T extends SquooshAutoZipItem> = {
  items: T[];
  activate: (item: T) => boolean | void | Promise<boolean | void>;
  signal: AbortSignal;
  onProgress?: (progress: SquooshAutoZipProgress) => void;
};

const DOWNLOAD_TIMEOUT_MS = 120_000;

function getDownloadLinks() {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[title="Download"][href^="blob:"][download]'))
    .filter((link) => Boolean(link.href) && Boolean(link.download));
}

function baseNameWithoutExtension(name: string) {
  return name.replace(/\.[^.]*$/, '');
}

function getPreferredDownloadLink(sourceFile: File, usedHrefs: Set<string>) {
  const sourceBaseName = baseNameWithoutExtension(sourceFile.name);
  const matchingLinks = getDownloadLinks()
    .filter((link) => !usedHrefs.has(link.href))
    .filter((link) => baseNameWithoutExtension(link.download) === sourceBaseName);
  if (matchingLinks.length < 2) return undefined;
  return matchingLinks.at(-1);
}

function markMatchingLinksAsUsed(sourceFile: File, usedHrefs: Set<string>) {
  const sourceBaseName = baseNameWithoutExtension(sourceFile.name);
  getDownloadLinks()
    .filter((link) => baseNameWithoutExtension(link.download) === sourceBaseName)
    .forEach((link) => usedHrefs.add(link.href));
}

function assertNotAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Auto ZIP cancelled.', 'AbortError');
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Auto ZIP cancelled.', 'AbortError'));
    }, { once: true });
  });
}

async function waitForDownloadLink(sourceFile: File, usedHrefs: Set<string>, signal: AbortSignal) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < DOWNLOAD_TIMEOUT_MS) {
    assertNotAborted(signal);
    const link = getPreferredDownloadLink(sourceFile, usedHrefs);
    if (link?.href) return link;
    await wait(250, signal);
  }
  throw new Error(`Timed out waiting for ${sourceFile.name} to finish in Squoosh.`);
}

function uniqueName(name: string, usedNames: Set<string>) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex === -1 ? name : name.slice(0, dotIndex);
  const extension = dotIndex === -1 ? '' : name.slice(dotIndex);
  let index = 2;
  let nextName = `${base}-${index}${extension}`;
  while (usedNames.has(nextName)) {
    index += 1;
    nextName = `${base}-${index}${extension}`;
  }
  usedNames.add(nextName);
  return nextName;
}

export async function runSquooshAutoZip<T extends SquooshAutoZipItem>({
  items,
  activate,
  signal,
  onProgress,
}: RunSquooshAutoZipOptions<T>) {
  const zipEntries: ZipEntry[] = [];
  const usedNames = new Set<string>();
  const usedHrefs = new Set<string>();

  for (let index = 0; index < items.length; index += 1) {
    assertNotAborted(signal);
    const item = items[index];
    onProgress?.({ index: index + 1, total: items.length, phase: 'loading', filename: item.file.name });
    const activated = await activate(item);
    if (activated === false) throw new Error(`Could not load ${item.file.name} in Squoosh.`);

    onProgress?.({ index: index + 1, total: items.length, phase: 'waiting', filename: item.file.name });
    const link = await waitForDownloadLink(item.file, usedHrefs, signal);
    markMatchingLinksAsUsed(item.file, usedHrefs);

    onProgress?.({ index: index + 1, total: items.length, phase: 'collecting', filename: item.file.name });
    const response = await fetch(link.href, { signal });
    if (!response.ok) throw new Error(`Could not collect ${link.download || item.file.name}.`);
    const blob = await response.blob();
    zipEntries.push({
      name: uniqueName(link.download || item.file.name, usedNames),
      blob,
      lastModified: item.file.lastModified,
    });
  }

  onProgress?.({ index: items.length, total: items.length, phase: 'zipping' });
  return createZipBlob(zipEntries, signal);
}
