<template>
  <RouterView />
  <QuickCapture v-if="showQuickCapture" />
  <CheckinPrompt v-if="showQuickCapture && user" :user-id="user.id" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import QuickCapture from '@/modules/assistant/components/QuickCapture.vue'
import CheckinPrompt from '@/modules/assistant/components/CheckinPrompt.vue'
import { ensureTray, onDeepLink, registerCaptureShortcut } from '@/services/native'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, user, completeEmailLink } = useAuth()

// Mounted at the root so they work on every signed-in view, including Focus Mode.
const showQuickCapture = computed(() => isAuthenticated.value && route.meta.public !== true)

// Desktop shell only: system-wide capture shortcut and tray icon. No-ops on web and mobile.
onMounted(() => {
  void registerCaptureShortcut()
  void ensureTray()
  void onDeepLink(handleDeepLink)
})

// odeen://auth/... links from confirmation and recovery emails. A failed link shows
// its error on the login page.
async function handleDeepLink(url: string): Promise<void> {
  const path = await completeEmailLink(url)
  if (path) await router.push(path)
}
</script>
