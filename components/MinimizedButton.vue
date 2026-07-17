<script setup lang="ts">
import DraggableIconButton from './DraggableIconButton.vue';

defineProps<{
  iconUrl: string;
  count: number;
}>();

const emit = defineEmits<{
  open: [];
}>();
</script>

<template>
  <DraggableIconButton
    storage-key="squoosh-batch-minimized-position-left-top"
    :default-position="{ left: 16, top: 82 }"
    bounds="viewport"
    :gap="0"
    :size="45"
    label="Open Squoosh Batch image queue"
    title="Open image queue"
    button-class="rounded-[var(--radius-control)] border border-[rgba(255,0,102,0.22)] bg-white/85 shadow-[0_8px_24px_rgba(255,0,102,0.20),0_2px_8px_rgba(20,20,20,0.08)] backdrop-blur-[10px] hover:border-[rgba(255,0,102,0.36)] hover:bg-[rgba(255,245,249,0.92)] hover:shadow-[0_10px_28px_rgba(255,0,102,0.26),0_2px_8px_rgba(20,20,20,0.10)]"
    @press="emit('open')"
  >
    <img class="h-full w-full p-2" :src="iconUrl" alt="" draggable="false" />
    <span v-if="count" class="absolute -right-2.5 -top-2.5 grid size-6 place-items-center rounded-full border border-white/80 bg-[var(--brand-primary)] text-[11px] font-bold text-white shadow-[0_4px_10px_rgba(255,0,102,0.35)]">{{ count }}</span>
  </DraggableIconButton>
</template>
