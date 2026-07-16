<template>
  <Transition
    enter-active-class="transition duration-180 ease-out motion-reduce:transition-none"
    enter-from-class="translate-y-1 scale-95 opacity-0"
    enter-to-class="translate-y-0 scale-100 opacity-100"
    leave-active-class="transition duration-120 ease-in motion-reduce:transition-none"
    leave-from-class="translate-y-0 scale-100 opacity-100"
    leave-to-class="translate-y-1 scale-95 opacity-0"
  >
    <slot />
  </Transition>
</template>
