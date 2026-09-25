<template>
  <RouterView />
  <QuickCapture v-if="showQuickCapture" />
  <CheckinPrompt v-if="showQuickCapture && user" :user-id="user.id" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import QuickCapture from '@/modules/assistant/components/QuickCapture.vue'
import CheckinPrompt from '@/modules/assistant/components/CheckinPrompt.vue'

const route = useRoute()
const { isAuthenticated, user } = useAuth()

// Mounted at the root so they work on every signed-in view, including Focus Mode.
const showQuickCapture = computed(() => isAuthenticated.value && route.meta.public !== true)
</script>
