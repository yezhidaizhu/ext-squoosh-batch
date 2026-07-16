<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useLocalStorage, useWindowSize } from '@vueuse/core';
import { ImagePlus, X } from '@lucide/vue';
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
const isMinimized = ref(false);
const isDraggingOver = ref(false);
const fileInput = ref<HTMLInputElement>();
const extensionIconUrl = browser.runtime.getURL('/icon/48.png');
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
    return;
  }
  queue.value.push(...images.map((file) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  })));
  status.value = '';
}

function activate(item: QueueItem) {
  const target = document.querySelector<HTMLElement>('file-drop');
  if (!target) {
    status.value = 'Squoosh is still loading. Try again.';
    return;
  }
  const transfer = new DataTransfer();
  transfer.items.add(item.file);
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
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
  if (fileInput.value?.files) addFiles(fileInput.value.files);
  if (fileInput.value) fileInput.value.value = '';
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDraggingOver.value = false;
  if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
}

function onDragLeave(event: DragEvent) {
  const container = event.currentTarget as HTMLElement;
  if (!container.contains(event.relatedTarget as Node)) isDraggingOver.value = false;
}

onBeforeUnmount(() => {
  queue.value.forEach((item) => URL.revokeObjectURL(item.previewUrl));
});
</script>

<template>
  <AppearTransition>
    <Win v-if="!isMinimized" :init-pos="windowPosition" :max-win-style="{ top: '12px', right: '12px', width: '320px', height: 'calc(100vh - 24px)' }" @chg-pos="windowPosition = $event" @mini-win="isMinimized = true" @close-win="isMinimized = true">
      <template #title><span class="inline-flex h-full items-center gap-2"><img class="size-5 rounded-[var(--radius-control)]" :src="extensionIconUrl" alt="" /> Batch<span v-if="queue.length" class="tabular-nums">({{ queue.length }})</span></span></template>
      <template #header-action><button v-if="queue.length" class="h-7 cursor-pointer rounded-[var(--radius-control)] px-2 text-[11px] font-semibold text-[var(--brand-primary)] transition-colors duration-150 hover:bg-[rgba(255,0,102,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" type="button" aria-label="Clear image queue" title="Clear image queue" @click="clearQueue">Clear</button></template>
      <div class="relative flex h-full min-h-0 flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]" @dragover.prevent @dragenter.prevent="isDraggingOver = true" @dragleave="onDragLeave" @drop="onDrop">
        <input ref="fileInput" class="sr-only" type="file" accept="image/*,.avif,.jxl,.qoi,.wp2" multiple @change="onInputChange" />
        <p v-if="status" class="mx-3 mt-3 text-[12px] leading-4 text-red-700" role="status">{{ status }}</p>
        <ul v-if="queue.length" class="scroll-thin m-0 grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(76px,1fr))] content-start gap-2 overflow-y-auto p-2.5 pb-18" aria-label="Queued images">
          <li v-for="item in queue" :key="item.id" class="group relative min-w-0">
            <button class="relative block aspect-[3/4] w-full cursor-pointer rounded-[var(--radius-control)] bg-[var(--bg-secondary)] text-left shadow-[0_1px_2px_rgba(239,97,128,0.08)] ring-0 ring-[rgba(239,97,128,0.34)] outline-none transition-shadow duration-200 ease-out group-hover:shadow-[0_8px_18px_rgba(239,97,128,0.22)] group-hover:ring-1 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" :class="{ 'shadow-[0_0_0_2px_rgba(239,97,128,0.36),0_8px_18px_rgba(239,97,128,0.18)]': item.id === activeId }" type="button" :aria-current="item.id === activeId" :aria-label="`Edit ${item.file.name} in Squoosh`" @click="activate(item)">
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
        <DraggableIconButton v-if="queue.length" storage-key="squoosh-batch-add-button-position-right-bottom" :default-position="{ right: 12, bottom: 12 }" bounds="parent" anchor="right-bottom" label="Add images" title="Add images" button-class="rounded-full bg-[var(--brand-primary)] text-white shadow-[0_8px_18px_rgba(215,71,104,0.36)] hover:-translate-y-0.5 hover:bg-[var(--brand-primary-hover)]" @press="fileInput?.click()"><ImagePlus :size="16" aria-hidden="true" /></DraggableIconButton>
      </div>
    </Win>
  </AppearTransition>
  <AppearTransition>
    <MinimizedButton v-if="isMinimized" :icon-url="extensionIconUrl" :count="queue.length" @open="isMinimized = false" />
  </AppearTransition>
</template>
