<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useLocalStorage, useWindowSize } from '@vueuse/core';
import { Image, ImagePlus, X } from '@lucide/vue';
import AppearTransition from './AppearTransition.vue';
import DraggableIconButton from './DraggableIconButton.vue';
import MinimizedButton from './MinimizedButton.vue';
import Win from './win.vue';

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type WindowPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const { width: viewportWidth, height: viewportHeight } = useWindowSize();
const queue = ref<QueueItem[]>([]);
const activeId = ref<string>();
const status = ref('');
const isMinimized = ref(true);
const isDraggingOver = ref(false);
const fileInput = ref<HTMLInputElement>();
const extensionIconUrl = browser.runtime.getURL('/icon/48.png');
let isDispatchingToSquoosh = false;
const defaultWindowWidth = 320;
const defaultWindowHeight = Math.min(500, Math.max(340, viewportHeight.value - 72));
const windowPosition = useLocalStorage<WindowPosition>('squoosh-batch-window-position-left-top', {
  left: Math.max(12, viewportWidth.value - defaultWindowWidth - 12),
  top: Math.max(12, viewportHeight.value - defaultWindowHeight - 12),
  width: defaultWindowWidth,
  height: defaultWindowHeight,
});

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addFiles(files: FileList | File[]) {
  const images = Array.from(files).filter(
    (file) => file.type.startsWith('image/') || /\.(avif|jxl|qoi|wp2)$/i.test(file.name),
  );
  if (!images.length) {
    status.value = 'Choose an image supported by Squoosh.';
    return [];
  }
  const items = images.map((file) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  queue.value.push(...items);
  status.value = '';
  return items;
}

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function activate(item: QueueItem) {
  const target = document.querySelector<HTMLElement>('file-drop');
  if (!target) {
    status.value = 'Squoosh is still loading. Try again.';
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(item.file);
  isDispatchingToSquoosh = true;
  try {
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  } finally {
    isDispatchingToSquoosh = false;
  }
  activeId.value = item.id;
  status.value = '';
}

function removeItem(id: string) {
  const index = queue.value.findIndex((item) => item.id === id);
  if (index === -1) return;
  const [item] = queue.value.splice(index, 1);
  URL.revokeObjectURL(item.previewUrl);
  if (activeId.value === id) activeId.value = undefined;
}

function clearQueue() {
  queue.value.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  queue.value = [];
  activeId.value = undefined;
  status.value = '';
}

function onInputChange() {
  if (fileInput.value?.files) {
    const added = addFiles(fileInput.value.files);
    if (!activeId.value && added[0]) activate(added[0]);
  }
  if (fileInput.value) fileInput.value.value = '';
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDraggingOver.value = false;
  if (event.dataTransfer?.files) {
    const added = addFiles(event.dataTransfer.files);
    if (!activeId.value && added[0]) activate(added[0]);
  }
}

function onDragLeave(event: DragEvent) {
  const container = event.currentTarget as HTMLElement;
  if (!container.contains(event.relatedTarget as Node)) isDraggingOver.value = false;
}

function onPageDragEnter(event: DragEvent) {
  if (isDispatchingToSquoosh || !isFileDrag(event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  isDraggingOver.value = true;
}

function onPageDragOver(event: DragEvent) {
  if (isDispatchingToSquoosh) return;
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  isDraggingOver.value = true;
}

function onPageDragLeave(event: DragEvent) {
  if (event.clientX <= 0
    || event.clientY <= 0
    || event.clientX >= window.innerWidth
    || event.clientY >= window.innerHeight) {
    isDraggingOver.value = false;
  }
}

function onPageDrop(event: DragEvent) {
  if (isDispatchingToSquoosh) return;
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  isDraggingOver.value = false;
  document.querySelector<HTMLElement>('file-drop')
    ?.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
  if (event.dataTransfer?.files) {
    const added = addFiles(event.dataTransfer.files);
    if (added[0]) activate(added[0]);
  }
}

onMounted(() => {
  document.addEventListener('dragenter', onPageDragEnter, true);
  document.addEventListener('dragover', onPageDragOver, true);
  document.addEventListener('dragleave', onPageDragLeave, true);
  document.addEventListener('drop', onPageDrop, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('dragenter', onPageDragEnter, true);
  document.removeEventListener('dragover', onPageDragOver, true);
  document.removeEventListener('dragleave', onPageDragLeave, true);
  document.removeEventListener('drop', onPageDrop, true);
  queue.value.forEach((item) => URL.revokeObjectURL(item.previewUrl));
});
</script>

<template>
  <AppearTransition>
    <Win v-if="!isMinimized" :init-pos="windowPosition" :max-win-style="{ top: '12px', right: '12px', width: '320px', height: 'calc(100vh - 24px)' }" @chg-pos="windowPosition = $event" @mini-win="isMinimized = true" @close-win="isMinimized = true">
      <template #title><span class="inline-flex h-full items-center gap-2"><img class="size-5 rounded-[var(--radius-control)]" :src="extensionIconUrl" alt="" /> Batch</span></template>
      <div class="relative flex h-full min-h-0 flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]" @dragover.prevent @dragenter.prevent="isDraggingOver = true" @dragleave="onDragLeave" @drop="onDrop">
        <input ref="fileInput" class="sr-only" type="file" accept="image/*,.avif,.jxl,.qoi,.wp2" multiple @change="onInputChange" />
        <p v-if="status" class="mx-3 mt-3 text-[12px] leading-4 text-red-700" role="status">{{ status }}</p>
        <div v-if="queue.length" class="flex h-8 shrink-0 items-center justify-between px-2.5">
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold leading-none text-[var(--text-secondary)] tabular-nums"><span>{{ queue.length }}</span><Image :size="12" aria-hidden="true" /></span>
            <button class="h-6 cursor-pointer rounded-[var(--radius-control)] px-2 text-[11px] font-semibold text-[var(--brand-primary)] transition-colors duration-150 hover:bg-[rgba(255,0,102,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" type="button" aria-label="Clear image queue" title="Clear image queue" @click="clearQueue">Clear</button>
        </div>
        <ul v-if="queue.length" class="scroll-thin m-0 grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(76px,1fr))] content-start gap-2 overflow-y-auto px-2.5 pt-1 pb-18" aria-label="Queued images">
          <li v-for="item in queue" :key="item.id" class="group relative min-w-0">
            <button class="relative block aspect-[3/4] w-full cursor-pointer rounded-[var(--radius-control)] bg-[var(--bg-secondary)] text-left shadow-[0_1px_2px_rgba(239,97,128,0.08)] ring-0 ring-[var(--brand-primary)] outline-none transition-shadow duration-200 ease-out group-hover:shadow-[0_8px_18px_rgba(239,97,128,0.22)] group-hover:ring-2 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" :class="{ 'ring-2 shadow-[0_8px_18px_rgba(239,97,128,0.18)]': item.id === activeId }" type="button" :aria-current="item.id === activeId" :aria-label="`Edit ${item.file.name} in Squoosh`" @click="activate(item)">
              <img class="size-full rounded-[var(--radius-control)] object-cover" :src="item.previewUrl" alt="" />
              <span class="absolute bottom-0 right-0 rounded-tl-[var(--radius-control)] rounded-br-none bg-black/48 px-1.5 py-1 text-[10px] font-semibold leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] backdrop-blur-md tabular-nums">{{ formatBytes(item.file.size) }}</span>
            </button>
            <button class="absolute right-0 top-0 grid size-[21px] cursor-pointer place-items-center rounded-[var(--radius-control)] bg-[var(--brand-primary)] text-white opacity-0 outline-none transition-colors duration-150 ease-out hover:bg-[var(--brand-primary-hover)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] group-hover:opacity-100" type="button" :aria-label="`Remove ${item.file.name}`" :title="`Remove ${item.file.name}`" @click="removeItem(item.id)"><X :size="13" :stroke-width="2.6" aria-hidden="true" /></button>
          </li>
        </ul>
        <div v-else class="grid min-h-0 flex-1 place-items-center p-4 text-center text-[var(--text-tertiary)]">
          <button class="grid min-h-[112px] w-full max-w-[210px] cursor-pointer place-items-center rounded-[var(--radius-control)] border border-dashed border-[rgba(255,0,102,0.28)] bg-[rgba(255,0,102,0.045)] px-4 py-3 outline-none transition-colors duration-150 ease-out hover:border-[rgba(255,0,102,0.42)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" type="button" aria-label="Add images" @click="fileInput?.click()">
          <span class="grid place-items-center gap-2.5">
            <span class="grid size-5 place-items-center text-[var(--text-tertiary)]"><ImagePlus :size="18" aria-hidden="true" /></span>
            <span class="grid gap-0.5">
              <span class="text-[12px] font-medium leading-none text-[var(--text-secondary)]">Drop images here</span>
              <span class="text-[11px] leading-4 text-[var(--text-tertiary)]">or click to choose</span>
            </span>
          </span>
          </button>
        </div>
        <div v-if="isDraggingOver" class="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-[var(--radius-control)] border-2 border-dashed border-[var(--brand-primary)] bg-white/60 text-[var(--brand-primary)] backdrop-blur-sm"><span class="rounded-[var(--radius-control)] bg-[var(--brand-soft)] px-3 py-2 text-[12px] font-semibold">Drop to add images</span></div>
      </div>
    </Win>
  </AppearTransition>
  <AppearTransition>
    <MinimizedButton v-if="isMinimized" :icon-url="extensionIconUrl" :count="queue.length" @open="isMinimized = false" />
  </AppearTransition>
  <AppearTransition name="fade">
    <div v-if="isDraggingOver" class="pointer-events-none fixed inset-3 z-[1999] rounded-[var(--radius-panel)] border-2 border-dashed border-[var(--brand-primary)] bg-[rgba(255,0,102,0.045)]" aria-hidden="true" />
  </AppearTransition>
</template>
