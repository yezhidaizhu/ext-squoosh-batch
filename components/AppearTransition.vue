<script setup lang="ts">
withDefaults(defineProps<{
  name?: 'slide-x' | 'fade';
}>(), {
  name: 'slide-x',
});
</script>

<template>
  <Transition
    :enter-active-class="name === 'slide-x' ? 'transition duration-180 ease-out motion-reduce:transition-none' : 'transition-opacity duration-120 ease-out motion-reduce:transition-none'"
    :enter-from-class="name === 'slide-x' ? '-translate-x-2 opacity-0' : 'opacity-0'"
    :enter-to-class="name === 'slide-x' ? 'translate-x-0 opacity-100' : 'opacity-100'"
    :leave-active-class="name === 'slide-x' ? 'transition duration-120 ease-in motion-reduce:transition-none' : 'transition-opacity duration-100 ease-in motion-reduce:transition-none'"
    :leave-from-class="name === 'slide-x' ? 'translate-x-0 opacity-100' : 'opacity-100'"
    :leave-to-class="name === 'slide-x' ? '-translate-x-2 opacity-0' : 'opacity-0'"
  >
    <slot />
  </Transition>
</template>
