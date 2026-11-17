<template>
  <div class="consent">
    <div class="consent__card">
      <OdeenLogo class="consent__logo" />

      <p v-if="state === 'loading'" class="consent__text">Loading the request…</p>

      <template v-else-if="state === 'consent' && request">
        <p class="consent__label">Connect</p>
        <h1 class="consent__title">{{ request.clientName }} wants to use your ODEEN</h1>
        <p class="consent__text">
          It will act as <strong class="consent__strong">{{ request.userEmail }}</strong
          >: read and change your projects, tasks, captures and intentions. It cannot delete
          projects, tasks or captures.
        </p>
        <dl class="consent__details">
          <dt class="consent__term">Returns to</dt>
          <dd class="consent__value">{{ redirectHost }}</dd>
          <template v-if="request.scopes.length > 0">
            <dt class="consent__term">Scopes</dt>
            <dd class="consent__value">{{ request.scopes.join(', ') }}</dd>
          </template>
        </dl>

        <p v-if="error" class="consent__error">{{ error }}</p>

        <div class="consent__actions">
          <button class="consent__button" type="button" :disabled="deciding" @click="decide(false)">
            Deny
          </button>
          <button
            class="consent__button consent__button--primary"
            type="button"
            :disabled="deciding"
            @click="decide(true)"
          >
            Allow
          </button>
        </div>
      </template>

      <template v-else-if="state === 'redirecting'">
        <p class="consent__text">Taking you back…</p>
      </template>

      <template v-else>
        <h1 class="consent__title">This request can't be used</h1>
        <p class="consent__error">{{ error }}</p>
        <p class="consent__text">Start the connection again from the app that sent you here.</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import OdeenLogo from '@/components/OdeenLogo.vue'
import {
  decideOAuthAuthorization,
  getOAuthAuthorization,
} from '@/modules/auth/services/auth.service'
import type { OAuthAuthorizationRequest } from '@/modules/auth/types'

type ConsentState = 'loading' | 'consent' | 'redirecting' | 'failed'

const route = useRoute()
const state = ref<ConsentState>('loading')
const request = ref<OAuthAuthorizationRequest | null>(null)
const error = ref<string | null>(null)
const deciding = ref(false)

const redirectHost = computed(() => {
  if (!request.value) return ''
  const uri = request.value.redirectUri
  return uri.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i)?.[1] ?? uri
})

function leaveTo(url: string): void {
  state.value = 'redirecting'
  window.location.assign(url)
}

async function decide(approve: boolean): Promise<void> {
  if (!request.value) return
  deciding.value = true
  error.value = null

  const result = await decideOAuthAuthorization(request.value.authorizationId, approve)

  deciding.value = false
  if (result.error || !result.data) {
    error.value = result.error?.message ?? 'Could not complete the request'
    return
  }
  leaveTo(result.data)
}

onMounted(async () => {
  const id = route.query.authorization_id
  const result = await getOAuthAuthorization(typeof id === 'string' ? id : '')

  if (result.error || !result.data) {
    error.value = result.error?.message ?? 'Authorization request not found'
    state.value = 'failed'
    return
  }

  if (result.data.kind === 'redirect') {
    leaveTo(result.data.url)
    return
  }

  request.value = result.data.request
  state.value = 'consent'
})
</script>

<style scoped>
.consent {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  background-color: var(--color-background);
}

.consent__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 440px;
  padding: var(--space-xl) var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.consent__logo {
  height: 32px;
  align-self: flex-start;
}

.consent__label {
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--color-accent-strong);
}

.consent__title {
  font-family: var(--font-display);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
  color: var(--color-primary);
}

.consent__text {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.consent__strong {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
}

.consent__details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-xs) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background-color: var(--color-gray-100);
  font-size: var(--font-size-sm);
}

.consent__term {
  font-family: var(--font-display);
  font-size: var(--font-size-xxs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--color-gray-500);
  align-self: center;
}

.consent__value {
  color: var(--color-primary);
  word-break: break-all;
}

.consent__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.consent__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.consent__button {
  padding: var(--space-sm) var(--space-lg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
  cursor: pointer;
}

.consent__button:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.consent__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.consent__button--primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-on-accent);
}
</style>
