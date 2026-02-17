<template>
  <div class="design-system">
    <aside class="design-system__sidebar">
      <div class="design-system__sidebar-header">
        <div class="design-system__logo">
          <span class="material-symbols-outlined design-system__logo-icon">grid_view</span>
        </div>
        <p class="design-system__system-label">System 01</p>
        <h1 class="design-system__system-title">Desktop Atoms</h1>
        <p class="design-system__system-version">v2.0 &middot; Editorial</p>
      </div>

      <nav class="design-system__nav">
        <a
          v-for="item in navItems"
          :key="item.icon"
          class="design-system__nav-item"
          :class="{ 'design-system__nav-item--active': item.active }"
          href="#"
        >
          <span class="material-symbols-outlined design-system__nav-icon">{{ item.icon }}</span>
          {{ item.label }}
        </a>
      </nav>

      <div class="design-system__sidebar-footer">
        <div class="design-system__status-pill">
          <span class="design-system__status-dot"></span>
          <span class="design-system__status-text">System Stable</span>
        </div>
      </div>
    </aside>

    <main class="design-system__main">
      <div class="design-system__content">
        <div class="design-system__grid">
          <!-- Left column -->
          <div class="design-system__column-left">
            <!-- Typography section -->
            <section class="design-system__section">
              <SectionHeader icon="text_fields" title="Typography" meta="Inter Family" />

              <div class="design-system__typography-samples">
                <TypographySample specs="Bold / 64px / -2% Tracking" tag="Display H1" element="h1">
                  Focus.
                </TypographySample>

                <div class="design-system__typography-row">
                  <TypographySample specs="Semibold / 32px" tag="H2" element="h2">
                    Deep Work Session
                  </TypographySample>

                  <TypographySample specs="Medium / 20px" tag="H3" element="h3">
                    Cognitive Clarity
                  </TypographySample>
                </div>

                <TypographySample
                  specs="Regular / 16px / 160% Leading"
                  tag="Body"
                  element="p"
                  text-class="typography-sample__text--body"
                >
                  Cognitive clarity is achieved through the elimination of distractions. Design for
                  the flow state, prioritizing content over chrome. In a world of constant
                  notifications, the ability to focus becomes a superpower. This system is designed
                  to fade away.
                </TypographySample>
              </div>
            </section>

            <!-- Color palette section -->
            <section class="design-system__section">
              <SectionHeader icon="palette" title="Color Palette" />

              <div class="design-system__colors">
                <div class="design-system__colors-primary">
                  <ColorSwatch
                    name="Primary Black"
                    color="#111111"
                    text-color="#ffffff"
                    code-color="#6b7280"
                    :wide="true"
                  />
                  <ColorSwatch
                    name="Surface White"
                    color="#FFFFFF"
                    text-color="#111827"
                    code-color="#9ca3af"
                    :wide="true"
                  />
                </div>

                <div class="design-system__colors-status">
                  <StatusBadge variant="active" label="Active" code="#F3E8FF" />
                  <StatusBadge variant="focus" label="Focus" code="#E0F2FE" />
                  <StatusBadge variant="done" label="Done" code="#DCFCE7" />
                  <StatusBadge variant="neutral" label="Neutral" code="#F9FAFB" />
                </div>
              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="design-system__column-right">
            <!-- Iconography section -->
            <section class="design-system__section">
              <SectionHeader icon="interests" title="Iconography" />

              <div class="design-system__icons-grid">
                <IconBox
                  v-for="icon in icons"
                  :key="icon"
                  :name="icon"
                />
              </div>

              <div class="design-system__icons-meta">
                <div class="design-system__icons-divider"></div>
                <p class="design-system__icons-specs">
                  24px bounding box &middot; 1.5px stroke width &middot; 2px radius
                </p>
              </div>
            </section>

            <!-- Spacing section -->
            <section class="design-system__section">
              <SectionHeader icon="grid_4x4" title="Spacing System" />

              <div class="design-system__spacing-container">
                <SpacingBlock
                  size="64px"
                  height="48px"
                  width="100%"
                  label="XL Layout"
                  description="Global padding"
                />
                <SpacingBlock
                  size="32px"
                  height="32px"
                  width="75%"
                  label="L Section"
                  description="Section spacing"
                />
                <SpacingBlock
                  size="16px"
                  height="16px"
                  width="50%"
                  label="M Component"
                  description="Internal gap"
                />

                <div class="design-system__spacing-base">
                  <div class="design-system__spacing-dots">
                    <span class="design-system__spacing-dot design-system__spacing-dot--active"></span>
                    <span class="design-system__spacing-dot"></span>
                    <span class="design-system__spacing-dot"></span>
                    <span class="design-system__spacing-dot"></span>
                  </div>
                  <div class="design-system__spacing-base-info">
                    <p class="design-system__spacing-base-label">4px Base</p>
                    <p class="design-system__spacing-base-desc">Atomic unit</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import SectionHeader from '@/components/SectionHeader.vue'
import TypographySample from '@/components/TypographySample.vue'
import ColorSwatch from '@/components/ColorSwatch.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import IconBox from '@/components/IconBox.vue'
import SpacingBlock from '@/components/SpacingBlock.vue'

const navItems = [
  { icon: 'dashboard', label: 'Overview', active: true },
  { icon: 'text_fields', label: 'Typography', active: false },
  { icon: 'palette', label: 'Colors', active: false },
  { icon: 'interests', label: 'Icons', active: false },
]

const icons = ['dashboard', 'schedule', 'bar_chart', 'settings', 'folder', 'edit', 'search', 'bolt']
</script>

<style scoped>
.design-system {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--color-surface);
}

/* Sidebar */
.design-system__sidebar {
  width: 256px;
  border-right: var(--border-width) solid var(--color-gray-100);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: var(--color-surface);
  flex-shrink: 0;
}

.design-system__sidebar-header {
  padding: 40px var(--space-lg);
}

.design-system__logo {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: var(--border-width) solid var(--color-gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background);
  margin-bottom: var(--space-lg);
}

.design-system__logo-icon {
  font-size: var(--icon-size-lg);
  color: var(--color-primary);
}

.design-system__system-label {
  font-size: var(--font-size-xxs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-gray-400);
  margin-bottom: var(--space-sm);
  font-weight: var(--font-weight-medium);
}

.design-system__system-title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.01em;
  color: var(--color-primary);
}

.design-system__system-version {
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
  margin-top: var(--space-sm);
  font-family: monospace;
}

/* Nav */
.design-system__nav {
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.design-system__nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-500);
  border-radius: var(--radius-md);
  transition: all 0.2s;
  text-decoration: none;
}

.design-system__nav-item:hover {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.design-system__nav-item--active {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.design-system__nav-icon {
  font-size: var(--icon-size-sm);
  color: var(--color-gray-400);
}

.design-system__nav-item--active .design-system__nav-icon {
  color: var(--color-gray-500);
}

/* Sidebar footer */
.design-system__sidebar-footer {
  padding: var(--space-lg);
  border-top: var(--border-width) solid var(--color-gray-100);
}

.design-system__status-pill {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-sm);
  background-color: var(--color-background);
  border-radius: var(--radius-full);
  border: var(--border-width) solid var(--color-gray-100);
  width: fit-content;
}

.design-system__status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.design-system__status-text {
  font-size: var(--font-size-xxs);
  font-family: monospace;
  color: var(--color-gray-500);
}

/* Main content */
.design-system__main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.design-system__content {
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--space-lg) 48px;
}

.design-system__grid {
  display: grid;
  grid-template-columns: 7fr 5fr;
  gap: var(--space-xl);
}

.design-system__column-left,
.design-system__column-right {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.design-system__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Typography section */
.design-system__typography-samples {
  padding-left: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.design-system__typography-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
}

/* Colors section */
.design-system__colors {
  padding-left: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.design-system__colors-primary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.design-system__colors-status {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
}

/* Icons section */
.design-system__icons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  padding-left: var(--space-sm);
}

.design-system__icons-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding-left: var(--space-sm);
  padding-top: var(--space-sm);
}

.design-system__icons-divider {
  height: 1px;
  background-color: var(--color-gray-200);
  flex: 1;
}

.design-system__icons-specs {
  font-size: var(--font-size-xxs);
  color: var(--color-gray-400);
  font-family: monospace;
}

/* Spacing section */
.design-system__spacing-container {
  padding: var(--space-lg);
  background-color: rgba(249, 250, 251, 0.5);
  border: var(--border-width) solid var(--color-gray-100);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.design-system__spacing-base {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-md);
  border-top: var(--border-width) solid var(--color-gray-200);
}

.design-system__spacing-dots {
  display: flex;
  gap: var(--space-xs);
}

.design-system__spacing-dot {
  width: 4px;
  height: 4px;
  background-color: var(--color-gray-300);
}

.design-system__spacing-dot--active {
  background-color: var(--color-primary);
}

.design-system__spacing-base-info {
  text-align: right;
  width: 128px;
}

.design-system__spacing-base-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.design-system__spacing-base-desc {
  font-size: var(--font-size-xxs);
  color: var(--color-gray-400);
  margin-top: 4px;
}
</style>
