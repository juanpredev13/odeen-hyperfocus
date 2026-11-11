<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-card__title">ODEEN</h1>
      <p class="auth-card__subtitle">Reset your password</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__field">
          <label class="auth-form__label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            class="auth-form__input"
            type="email"
            autocomplete="email"
            required
          />
          <p class="auth-form__hint">We will email you a link to choose a new password.</p>
        </div>

        <p v-if="error" class="auth-form__error">{{ error.message }}</p>

        <p v-if="sent" class="auth-form__success" role="status">
          If an account exists for that email, a reset link is on its way. Open it in this same browser.
        </p>

        <button class="auth-form__submit" type="submit" :disabled="loading || sent">
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <p class="auth-card__footer">
        Remembered it?
        <RouterLink class="auth-card__link" to="/login">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '@/modules/auth/composables/useAuth'

const { loading, error, requestPasswordReset, clearError } = useAuth()

const email = ref('')
const sent = ref(false)

onMounted(clearError)

async function handleSubmit(): Promise<void> {
  // Same message whether or not the address has an account, so the form cannot be used
  // to find out who is registered.
  sent.value = await requestPasswordReset(email.value)
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
