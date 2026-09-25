<template>
  <TodayCard
    icon="radar"
    title="Check-ins"
    :value="todaySummary.count"
    :text="summaryText"
  >
    <div class="checkin-card__row">
      <label class="checkin-card__label" for="checkin-interval">Prompt</label>
      <select
        id="checkin-interval"
        class="checkin-card__select"
        :value="interval"
        :disabled="saving"
        @change="changeInterval(Number(($event.target as HTMLSelectElement).value) as CheckinInterval)"
      >
        <option v-for="o in CHECKIN_INTERVALS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <button class="checkin-card__now" type="button" @click="open">Check in now</button>
    </div>
    <p class="checkin-card__note">Only while ODEEN is open. Paused during focus sessions.</p>
  </TodayCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TodayCard from '@/modules/assistant/components/TodayCard.vue'
import { useCheckins } from '@/modules/assistant/composables/useCheckins'
import { useAssistantSettings } from '@/modules/assistant/composables/useAssistantSettings'
import { CHECKIN_INTERVALS } from '@/modules/assistant/composables/checkinHelpers'
import type { CheckinInterval } from '@/modules/assistant/types'

const { todaySummary, open } = useCheckins()
const { effectiveSettings, saveSettings } = useAssistantSettings()

const saving = ref(false)
const interval = computed(() => effectiveSettings().checkin_interval)

const summaryText = computed(() => {
  const s = todaySummary.value
  if (s.count === 0) return 'Notice where your attention is. No check-ins yet today.'
  const parts = [`${s.count} today`]
  if (s.intentionalPercent !== null) parts.push(`${s.intentionalPercent}% on plan`)
  if (s.lastEnergy !== null) parts.push(`energy ${s.lastEnergy}/5`)
  return parts.join(' · ')
})

async function changeInterval(value: CheckinInterval): Promise<void> {
  saving.value = true
  await saveSettings({ checkin_interval: value })
  saving.value = false
}
</script>

<style scoped>
.checkin-card__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.checkin-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
}

.checkin-card__select {
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 2px var(--space-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  background: var(--color-surface);
}

.checkin-card__now {
  margin-left: auto;
  padding: 2px var(--space-sm);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  cursor: pointer;
}

.checkin-card__now:hover {
  border-color: var(--color-primary);
}

.checkin-card__note {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}
</style>
