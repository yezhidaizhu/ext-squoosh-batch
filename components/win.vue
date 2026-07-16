<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, StyleValue, watch } from 'vue'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { debounce, throttle } from 'lodash-es'

const props = withDefaults(defineProps<{
  maxWinStyle?: StyleValue,
  initPos?: {
    left: number,
    top: number,
    width: number,
    height: number,
  }
}>(), {
})

const emits = defineEmits(['chg-pos', 'close-win', 'mini-win', 'max-win']);

const isMaxWin = defineModel<boolean>('isMaxWin', { default: false });

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const dragHandleRef = useTemplateRef<HTMLElement>('dragHandleRef')
const resizeHandleRef = useTemplateRef<HTMLElement>('resizeHandleRef')

const { width: elementWidth, height: elementHeight } = useElementSize(containerRef)
const { width: windowWidth, height: windowHeight } = useWindowSize()

const GAP = 8
const MIN_WIDTH = 160
const MIN_HEIGHT = 100
const THROTTLE_WAIT = 20

const left = ref(GAP)
const top = ref(GAP)

const width = ref<number>(420)
const height = ref<number>(240)

let mode: 'drag' | 'resize' | null = null

let startClientX = 0
let startClientY = 0

let startWindowLeft = 0
let startWindowTop = 0

let startWidth = 0
let startHeight = 0

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getCurrentWidth() {
  return width.value ?? elementWidth.value
}

function getCurrentHeight() {
  return height.value ?? elementHeight.value
}

function clampPosition() {
  const currentWidth = getCurrentWidth()
  const currentHeight = getCurrentHeight()

  const maxLeft = Math.max(0, windowWidth.value - currentWidth)
  const maxTop = Math.max(0, windowHeight.value - currentHeight)

  left.value = clampValue(left.value, 0, maxLeft)
  top.value = clampValue(top.value, 0, maxTop)
}

function clampSize() {
  const maxWidth = Math.max(MIN_WIDTH, windowWidth.value - left.value)
  const maxHeight = Math.max(MIN_HEIGHT, windowHeight.value - top.value)

  width.value = clampValue(getCurrentWidth(), MIN_WIDTH, maxWidth)
  height.value = clampValue(getCurrentHeight(), MIN_HEIGHT, maxHeight)
}

function fix() {
  clampSize()
  clampPosition()
}

async function init() {
  await nextTick()

  if (!elementWidth.value || !elementHeight.value) return

  width.value = elementWidth.value
  height.value = elementHeight.value

  left.value = left.value ?? GAP
  top.value = top.value ?? GAP

  fix()
}

const onPointerMove = throttle((e: PointerEvent) => {
  if (mode === 'drag') {
    left.value = startWindowLeft + (e.clientX - startClientX)
    top.value = startWindowTop + (e.clientY - startClientY)

    clampPosition()
    return
  }

  if (mode === 'resize') {
    const nextWidth = startWidth + (e.clientX - startClientX)
    const nextHeight = startHeight + (e.clientY - startClientY)

    width.value = clampValue(nextWidth, MIN_WIDTH, windowWidth.value - left.value)
    height.value = clampValue(nextHeight, MIN_HEIGHT, windowHeight.value - top.value)

    fix()
  }
}, THROTTLE_WAIT, {
  leading: true,
  trailing: true,
})

function onDragPointerDown(e: PointerEvent) {
  mode = 'drag'

  startClientX = e.clientX
  startClientY = e.clientY
  startWindowLeft = left.value
  startWindowTop = top.value

  dragHandleRef.value?.setPointerCapture(e.pointerId)

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onResizePointerDown(e: PointerEvent) {
  mode = 'resize'

  startClientX = e.clientX
  startClientY = e.clientY

  startWidth = getCurrentWidth()
  startHeight = getCurrentHeight()

  resizeHandleRef.value?.setPointerCapture(e.pointerId)

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerUp() {
  mode = null

  onPointerMove.flush()
  fix()

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onMounted(() => {
  if (props.initPos) {
    left.value = props.initPos.left;
    top.value = props.initPos.top;
    width.value = props.initPos.width;
    height.value = props.initPos.height;
  };
  init()
})

watch([elementWidth, elementHeight], () => {
  if (width.value === undefined && height.value === undefined) {
    init()
  }
})

watch([windowWidth, windowHeight], () => {
  fix()
})

onBeforeUnmount(() => {
  mode = null
  onPointerMove.cancel()

  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

const onToggleMaxWin = () => {
  isMaxWin.value = !isMaxWin.value;
  emits('max-win', isMaxWin);
}

const style = computed(() => {
  if (isMaxWin.value && props.maxWinStyle) {
    return props.maxWinStyle
  };

  return ({
    left: `${left.value}px`,
    top: `${top.value}px`,
    width: width.value === undefined ? undefined : `${width.value}px`,
    height: height.value === undefined ? undefined : `${height.value}px`,
  })
});

const afterChgWinPos = debounce(() => {
  emits('chg-pos', {
    left: left.value,
    top: top.value,
    width: width.value,
    height: height.value,
  });
}, 200);

watch([width, height, left, top], () => {
  afterChgWinPos()
})
</script>

<template>
  <div ref="containerRef" :style="style"
    class="fixed z-[2000] flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-[var(--panel-surface)] shadow-[var(--panel-shadow)] backdrop-blur-xl">
    <!-- 可拖拽标题栏 -->
    <div ref="dragHandleRef"
      class="group/bar relative shrink-0 flex h-10 items-center border-b border-[var(--header-border)] bg-[var(--header-surface)] px-3 select-none touch-none"
      :class="isMaxWin ? '' : 'cursor-move'" @pointerdown.prevent="onDragPointerDown">
      <p class="m-0 flex h-full min-w-0 flex-1 items-center truncate text-[13px] font-semibold text-[var(--text-primary)]"><slot name="title">Batch</slot></p>
      <div class="flex h-full shrink-0 items-center gap-1" @pointerdown.stop>
        <slot name="header-action" />
        <button type="button" class="grid size-7 cursor-pointer place-items-center rounded-[var(--radius-control)] border border-[rgba(239,97,128,0.16)] bg-[var(--brand-soft)] text-[var(--brand-primary)] transition-colors duration-150 hover:border-[rgba(239,97,128,0.26)] hover:bg-[rgba(239,97,128,0.18)] hover:text-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" aria-label="Hide image queue" title="Hide image queue" @click="$emit('close-win')">
          <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 8h8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容 -->
    <div class="flex-1 min-h-0">
      <slot />
    </div>

    <!-- 右下角 resize -->
    <div ref="resizeHandleRef" v-show="!isMaxWin"
      class="absolute right-0 bottom-0 h-6 w-6 cursor-se-resize select-none touch-none text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      @pointerdown.prevent.stop="onResizePointerDown">
      <svg class="absolute right-1 bottom-1 h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 14L14 6M10 14L14 10M14 14H14.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </div>
  </div>
</template>
