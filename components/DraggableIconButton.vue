<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalStorage, useWindowSize } from '@vueuse/core';

type Position = {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
};

type Anchor = 'left-top' | 'right-bottom';

const props = withDefaults(defineProps<{
  storageKey: string;
  defaultPosition: Position;
  bounds?: 'viewport' | 'parent';
  anchor?: Anchor;
  label: string;
  title: string;
  buttonClass?: string;
  size?: number;
  gap?: number;
}>(), {
  bounds: 'viewport',
  anchor: 'left-top',
  buttonClass: '',
  size: 44,
  gap: 12,
});

const emit = defineEmits<{
  press: [];
}>();

const { width: viewportWidth, height: viewportHeight } = useWindowSize();
const buttonRef = ref<HTMLButtonElement>();
const position = useLocalStorage<Position>(props.storageKey, props.defaultPosition);
const style = computed(() => (props.anchor === 'right-bottom'
  ? {
      right: `${getHorizontalPosition()}px`,
      bottom: `${getVerticalPosition()}px`,
    }
  : {
      left: `${getHorizontalPosition()}px`,
      top: `${getVerticalPosition()}px`,
    }));

let resizeObserver: ResizeObserver | undefined;
let startClientX = 0;
let startClientY = 0;
let startHorizontal = 0;
let startVertical = 0;
const isDragging = ref(false);
let didDrag = false;
let lastDragAt = 0;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBoundsSize() {
  if (props.bounds === 'parent') {
    const parentRect = buttonRef.value?.parentElement?.getBoundingClientRect();
    if (parentRect) return { width: parentRect.width, height: parentRect.height };
  }
  return { width: viewportWidth.value, height: viewportHeight.value };
}

function getHorizontalPosition() {
  return props.anchor === 'right-bottom'
    ? position.value.right ?? props.defaultPosition.right ?? props.gap
    : position.value.left ?? props.defaultPosition.left ?? props.gap;
}

function getVerticalPosition() {
  return props.anchor === 'right-bottom'
    ? position.value.bottom ?? props.defaultPosition.bottom ?? props.gap
    : position.value.top ?? props.defaultPosition.top ?? props.gap;
}

function setPosition(horizontal: number, vertical: number) {
  position.value = props.anchor === 'right-bottom'
    ? { right: horizontal, bottom: vertical }
    : { left: horizontal, top: vertical };
}

function clampPosition() {
  const bounds = getBoundsSize();
  const maxHorizontal = Math.max(props.gap, bounds.width - props.size - props.gap);
  const maxVertical = Math.max(props.gap, bounds.height - props.size - props.gap);
  setPosition(
    clampValue(getHorizontalPosition(), props.gap, maxHorizontal),
    clampValue(getVerticalPosition(), props.gap, maxVertical),
  );
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return;

  const deltaX = event.clientX - startClientX;
  const deltaY = event.clientY - startClientY;
  if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) didDrag = true;
  if (!didDrag) return;

  setPosition(
    props.anchor === 'right-bottom' ? startHorizontal - deltaX : startHorizontal + deltaX,
    props.anchor === 'right-bottom' ? startVertical - deltaY : startVertical + deltaY,
  );
  clampPosition();
  event.preventDefault();
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
}

function onPointerUp() {
  if (didDrag) lastDragAt = performance.now();
  stopDrag();
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  isDragging.value = true;
  didDrag = false;
  startClientX = event.clientX;
  startClientY = event.clientY;
  startHorizontal = getHorizontalPosition();
  startVertical = getVerticalPosition();

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onClick() {
  if (performance.now() - lastDragAt < 200) return;
  emit('press');
}

watch([viewportWidth, viewportHeight], clampPosition);

onMounted(async () => {
  await nextTick();
  clampPosition();
  const parent = buttonRef.value?.parentElement;
  if (parent && props.bounds === 'parent') {
    resizeObserver = new ResizeObserver(clampPosition);
    resizeObserver.observe(parent);
  }
});

onBeforeUnmount(() => {
  stopDrag();
  resizeObserver?.disconnect();
});
</script>

<template>
  <button
    ref="buttonRef"
    :style="style"
    class="grid size-11 cursor-pointer touch-none place-items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
    :class="[props.bounds === 'viewport' ? 'fixed z-[2000]' : 'absolute z-10', isDragging ? 'transition-none' : 'transition duration-150', props.buttonClass]"
    type="button"
    :aria-label="props.label"
    :title="title"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <slot />
  </button>
</template>
