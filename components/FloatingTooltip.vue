<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const props = withDefaults(defineProps<{
  text?: string;
  anchor?: AnchorRect;
  maxWidth?: number;
}>(), {
  maxWidth: 168,
});

const tooltipRef = ref<HTMLElement>();
const style = ref<Record<string, string>>({
  left: '-9999px',
  top: '-9999px',
  zIndex: '2147483647',
});

async function updatePosition() {
  if (!props.text || !props.anchor) return;
  await nextTick();

  const tooltip = tooltipRef.value;
  if (!tooltip) return;

  const gap = 7;
  const edge = 8;
  const rect = tooltip.getBoundingClientRect();
  const preferredTop = props.anchor.top - rect.height - gap;
  const canShowAbove = preferredTop >= edge;
  const top = canShowAbove
    ? preferredTop
    : Math.min(props.anchor.bottom + gap, window.innerHeight - rect.height - edge);
  const centeredLeft = props.anchor.left + props.anchor.width / 2 - rect.width / 2;
  const left = Math.min(
    Math.max(centeredLeft, edge),
    window.innerWidth - rect.width - edge,
  );

  style.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    maxWidth: `${props.maxWidth}px`,
    zIndex: '2147483647',
  };
}

watch(() => [props.text, props.anchor], updatePosition, { immediate: true, deep: true });
</script>

<template>
  <Teleport to="#squoosh-batch-root">
    <div
      v-if="text && anchor"
      ref="tooltipRef"
      class="pointer-events-none fixed w-max max-w-[168px] rounded-[var(--radius-control)] border border-white/10 bg-black/75 px-2 py-1.5 text-center text-[10px] font-medium leading-[14px] text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] backdrop-blur-md"
      :style="style"
      role="tooltip"
    >
      {{ text }}
    </div>
  </Teleport>
</template>
