<template>
  <section
    v-if="promptOpen"
    class="checkin"
    role="region"
    aria-labelledby="checkin-title"
  >
    <header class="checkin__header">
      <h2 id="checkin-title" class="checkin__title">
        <span class="material-symbols-outlined" aria-hidden="true">radar</span>
        Quick check-in
      </h2>
      <button class="checkin__skip" type="button" @click="dismiss">Skip</button>
    </header>

    <form class="checkin__form" @submit.prevent="submit">
      <fieldset class="checkin__question">
        <legend class="checkin__legend">Doing what you decided to do?</legend>
        <div class="checkin__options">
          <button v-for="o in BOOL_YES_NO" :key="String(o.value)" class="checkin__option" :class="{ 'checkin__option--active': answers.intentional === o.value }" type="button" :aria-pressed="answers.intentional === o.value" @click="toggle('intentional', o.value)">{{ o.label }}</button>
        </div>
      </fieldset>

      <fieldset class="checkin__question">
        <legend class="checkin__legend">On the most consequential task right now?</legend>
        <div class="checkin__options">
          <button v-for="o in BOOL_YES_NO" :key="String(o.value)" class="checkin__option" :class="{ 'checkin__option--active': answers.on_consequential === o.value }" type="button" :aria-pressed="answers.on_consequential === o.value" @click="toggle('on_consequential', o.value)">{{ o.label }}</button>
        </div>
      </fieldset>

      <fieldset class="checkin__question">
        <legend class="checkin__legend">How full is your attention?</legend>
        <div class="checkin__options">
          <button v-for="o in FULLNESS" :key="o.value" class="checkin__option" :class="{ 'checkin__option--active': answers.space_fullness === o.value }" type="button" :aria-pressed="answers.space_fullness === o.value" @click="toggle('space_fullness', o.value)">{{ o.label }}</button>
        </div>
      </fieldset>

      <fieldset class="checkin__question">
        <legend class="checkin__legend">Energy</legend>
        <div class="checkin__options">
          <button v-for="n in ENERGY" :key="n" class="checkin__option checkin__option--square" :class="{ 'checkin__option--active': answers.energy === n }" type="button" :aria-pressed="answers.energy === n" :aria-label="`Energy ${n} of 5`" @click="toggle('energy', n)">{{ n }}</button>
        </div>
      </fieldset>

      <p v-if="error" class="checkin__error" role="alert">{{ error.message }}</p>

      <button class="checkin__save" type="submit" :disabled="!hasAnswer(answers) || saving">Save</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useCheckins } from '@/modules/assistant/composables/useCheckins'
import { EMPTY_ANSWERS, hasAnswer, isDue } from '@/modules/assistant/composables/checkinHelpers'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import { useActiveSessionId } from '@/modules/focus/composables/useFocusSession'
import type { CheckinAnswers, EnergyRating, SpaceFullness } from '@/modules/assistant/types'

const props = defineProps<{ userId: string }>()

const BOOL_YES_NO = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
] as const
const FULLNESS: readonly { value: SpaceFullness; label: string }[] = [
  { value: 1, label: 'Room to spare' },
  { value: 2, label: 'Busy' },
  { value: 3, label: 'Overflowing' },
]
const ENERGY: readonly EnergyRating[] = [1, 2, 3, 4, 5]

const { promptOpen, lastActivityAt, error, load, open, dismiss, save } = useCheckins()
const { fetchSettings, effectiveSettings } = useAssistantSettings()
const activeSessionId = useActiveSessionId()

const answers = reactive<CheckinAnswers>({ ...EMPTY_ANSWERS })
const saving = ref(false)
const since = new Date()
let timer: ReturnType<typeof setInterval> | null = null

function toggle<K extends keyof CheckinAnswers>(key: K, value: NonNullable<CheckinAnswers[K]>): void {
  answers[key] = (answers[key] === value ? null : value) as CheckinAnswers[K]
}

function reset(): void {
  Object.assign(answers, EMPTY_ANSWERS)
}

async function submit(): Promise<void> {
  saving.value = true
  const ok = await save({ ...answers })
  saving.value = false
  if (ok) reset()
}

function evaluate(): void {
  const due = isDue(
    effectiveSettings().checkin_interval,
    lastActivityAt.value,
    since,
    new Date(),
    activeSessionId.value !== null,
  )
  if (due) open()
}

onMounted(async () => {
  await Promise.all([fetchSettings(), load(props.userId)])
  evaluate()
  timer = setInterval(evaluate, 30_000)
})

onUnmounted(() => {
  if (timer !== null) clearInterval(timer)
})
</script>

<style scoped>
.checkin {
  position: fixed;
  left: calc(220px + var(--space-lg));
  bottom: var(--space-lg);
  z-index: 1050; /* above Focus Mode (1000), below its settings modal (1100) */
  width: min(360px, calc(100vw - 2 * var(--space-lg)));
  padding: var(--space-md);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.checkin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.checkin__title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.checkin__title .material-symbols-outlined {
  font-size: 18px;
}

.checkin__skip {
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  cursor: pointer;
}

.checkin__skip:hover {
  color: var(--color-primary);
}

.checkin__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.checkin__question {
  margin: 0;
  padding: 0;
  border: none;
}

.checkin__legend {
  margin-bottom: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.checkin__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.checkin__option {
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
  cursor: pointer;
}

.checkin__option--square {
  min-width: 28px;
}

.checkin__option--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}

.checkin__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger-text);
}

.checkin__save {
  align-self: flex-end;
  padding: var(--space-xs) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.checkin__save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .checkin {
    left: var(--space-md);
    bottom: calc(var(--space-lg) + 48px);
  }
}
</style>
