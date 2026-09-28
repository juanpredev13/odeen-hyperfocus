<template>
  <RouterView />
  <QuickCapture v-if="showQuickCapture" />
  <CheckinPrompt v-if="showQuickCapture && user" :user-id="user.id" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import QuickCapture from '@/modules/assistant/components/QuickCapture.vue'
import CheckinPrompt from '@/modules/assistant/components/CheckinPrompt.vue'
import { ensureTray, registerCaptureShortcut } from '@/services/native'

const route = useRoute()
const { isAuthenticated, user } = useAuth()

// Mounted at the root so they work on every signed-in view, including Focus Mode.
const showQuickCapture = computed(() => isAuthenticated.value && route.meta.public !== true)

// Desktop shell only: system-wide capture shortcut and tray icon. No-ops on web and mobile.
onMounted(() => {
  void registerCaptureShortcut()
  void ensureTray()
})
</script>
