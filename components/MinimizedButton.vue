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
    :default-position="{ left: 16, top: 16 }"
    bounds="viewport"
    :gap="0"
    label="Open Squoosh Batch image queue"
    title="Open image queue"
    button-class="rounded-[var(--radius-control)] bg-[rgba(255,0,102,0.77)] shadow-[0_10px_24px_rgba(255,0,102,0.28)] hover:bg-[var(--brand-primary-hover)]"
    @press="emit('open')"
  >
    <img class="size-7" :src="iconUrl" alt="" draggable="false" />
    <span v-if="count" class="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(239,68,68,0.35)]">{{ count }}</span>
  </DraggableIconButton>
</template>
