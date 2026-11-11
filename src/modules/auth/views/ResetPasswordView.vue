<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-card__title">ODEEN</h1>
      <p class="auth-card__subtitle">Choose a new password</p>

      <p v-if="checking" class="auth-form__hint">Checking your link…</p>

      <div v-else-if="linkError" class="auth-form">
        <p class="auth-form__error" role="alert">{{ linkError }}</p>
        <RouterLink class="auth-card__link" to="/forgot-password">Request a new link</RouterLink>
      </div>

      <div v-else-if="done" class="auth-form">
        <p class="auth-form__success" role="status">Password updated. You are signed in.</p>
        <RouterLink class="auth-form__submit auth-form__submit--link" to="/">Continue to ODEEN</RouterLink>
      </div>

      <form v-else class="auth-form" @submit.prevent="handleSubmit">
        <!-- Lets password managers store the new password against the right account. -->
        <input class="auth-form__username" type="email" autocomplete="username" :value="email" readonly hidden />
        <div class="auth-form__field">
          <label class="auth-form__label" for="password">New password</label>
          <input
            id="password"
            v-model="password"
            class="auth-form__input"
            type="password"
            autocomplete="new-password"
            minlength="10"
            aria-describedby="password-hint"
            required
          />
          <p id="password-hint" class="auth-form__hint">
            At least 10 characters, with upper and lower case letters and a number.
          </p>
        </div>

        <div class="auth-form__field">
          <label class="auth-form__label" for="confirm">Repeat new password</label>
          <input
            id="confirm"
            v-model="confirm"
            class="auth-form__input"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="mismatch" class="auth-form__error">Passwords do not match.</p>
        <p v-else-if="error" class="auth-form__error">{{ error.message }}</p>

        <button class="auth-form__submit" type="submit" :disabled="loading">
          {{ loading ? 'Saving…' : 'Save new password' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/modules/auth/composables/useAuth'
import { getSession } from '@/modules/auth/services/auth.service'

const route = useRoute()
const { loading, error, updatePassword, clearError } = useAuth()

const checking = ref(true)
const linkError = ref<string | null>(null)
const done = ref(false)
const email = ref('')
const password = ref('')
const confirm = ref('')
const mismatch = ref(false)

const INVALID_LINK = 'This reset link is invalid or has expired, or it was opened in a different browser.'

onMounted(async () => {
  clearError()

  // Supabase sends expired or used links back with an error in the query string.
  const description = route.query.error_description
  if (typeof description === 'string' && description) {
    linkError.value = `${description}.`
    checking.value = false
    return
  }

  // The client exchanges the link's code for a session before this resolves.
  const result = await getSession()
  if (result.error) linkError.value = result.error.message
  else if (!result.data) linkError.value = INVALID_LINK
  else email.value = result.data.email
  checking.value = false
})

async function handleSubmit(): Promise<void> {
  mismatch.value = password.value !== confirm.value
  if (mismatch.value) return

  done.value = await updatePassword(password.value)
}
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background);
  padding: var(--space-md);
}

.auth-card {
  background-color: var(--color-surface);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-sm);
}

.auth-card__title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-primary);
  margin-bottom: var(--space-xs);
}

.auth-card__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  margin-bottom: var(--space-lg);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.auth-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.auth-form__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.auth-form__input {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-body);
  color: var(--color-primary);
  background-color: var(--color-surface);
  outline: none;
  transition: border-color 0.2s;
}

.auth-form__input:focus {
  border-color: var(--color-primary);
}

.auth-form__error {
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
}

.auth-form__hint {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
}

.auth-form__success {
  font-size: var(--font-size-sm);
  color: var(--color-status-done-text);
}

.auth-form__submit {
  background-color: var(--color-primary);
  color: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: var(--space-xs);
}

.auth-form__submit--link {
  display: block;
  text-align: center;
  text-decoration: none;
}

.auth-form__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-card__footer {
  font-size: var(--font-size-sm);
  color: var(--color-gray-500);
  text-align: center;
  margin-top: var(--space-lg);
}

.auth-card__link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
}
</style>
