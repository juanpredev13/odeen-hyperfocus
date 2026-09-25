<template>
  <RouterView />
  <QuickCapture v-if="showQuickCapture" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import QuickCapture from '@/modules/assistant/components/QuickCapture.vue'

const route = useRoute()
const { isAuthenticated } = useAuth()

// Mounted at the root so it works on every signed-in view, including Focus Mode.
const showQuickCapture = computed(() => isAuthenticated.value && route.meta.public !== true)
</script>
