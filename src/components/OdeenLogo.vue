<template>
  <svg
    class="odeen-logo"
    :class="`odeen-logo--${variant}`"
    :viewBox="variant === 'symbol' ? '0 0 256 256' : '0 0 954 256'"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <defs>
      <clipPath :id="clipId">
        <path clip-rule="evenodd" :d="DAGAZ_CLIP" />
      </clipPath>
    </defs>
    <g :clip-path="`url(#${clipId})`">
      <path class="odeen-logo__ink" :d="DAGAZ" />
    </g>
    <path class="odeen-logo__eye" :d="DAGAZ_EYE" />
    <g v-if="variant === 'lockup'" transform="translate(296,0)">
      <path class="odeen-logo__ink" :d="WORDMARK" />
      <path class="odeen-logo__eye" :d="WORDMARK_EYE" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { useId } from 'vue'

// Dagaz ᛞ ("day") with Odin's eye at the crossing, plus the carved ODEEN
// wordmark, built from straight "carved" strokes at 0/30/60/90 degrees.
const DAGAZ =
  'M36,40 L70,40 L70,216 L36,216 Z M186,40 L220,40 L220,216 L186,216 Z ' +
  'M66,40 L111,40 L190,216 L145,216 Z M111,216 L66,216 L145,40 L190,40 Z'
const DAGAZ_CLIP = 'M0,0 H256 V256 H0 Z M98,128 A30,30 0 1 1 158,128 A30,30 0 1 1 98,128 Z'
const DAGAZ_EYE = 'M115,128 A13,13 0 1 1 141,128 A13,13 0 1 1 115,128 Z'
const WORDMARK =
  'M34,48 L86,48 L120,107 L120,149 L86,208 L34,208 L0,149 L0,107 Z ' +
  'M26,111 L26,145 L47,182 L73,182 L94,145 L94,111 L73,74 L47,74 Z ' +
  'M144,48 L216,48 L250,107 L250,149 L216,208 L144,208 Z ' +
  'M170,182 L203,182 L224,145 L224,111 L203,74 L170,74 Z ' +
  'M274,48 L300,48 L300,208 L274,208 Z M274,48 L374,48 L374,74 L274,74 Z ' +
  'M274,182 L374,182 L374,208 L274,208 Z M299,100 L358,133 L358,163 L299,130 Z ' +
  'M398,48 L424,48 L424,208 L398,208 Z M398,48 L498,48 L498,74 L398,74 Z ' +
  'M398,182 L498,182 L498,208 L398,208 Z M423,100 L482,133 L482,163 L423,130 Z ' +
  'M522,48 L548,48 L548,208 L522,208 Z M632,48 L658,48 L658,208 L632,208 Z ' +
  'M531,48 L567,48 L658,208 L622,208 Z'
const WORDMARK_EYE = 'M60,112 L76,128 L60,144 L44,128 Z'

withDefaults(defineProps<{ variant?: 'symbol' | 'lockup'; label?: string }>(), {
  variant: 'lockup',
  label: 'ODEEN',
})

const clipId = `odeen-logo-${useId()}`
</script>

<style scoped>
.odeen-logo {
  display: block;
  height: 100%;
  width: auto;
}

.odeen-logo__ink {
  fill: var(--color-primary);
}

/* Odin's eye: the one "live dot" of the mark, so it takes the accent. */
.odeen-logo__eye {
  fill: var(--color-accent);
}
</style>
