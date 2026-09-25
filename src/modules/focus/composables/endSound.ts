/** A short, soft two-tone chime. Silently does nothing where Web Audio is unavailable. */
export function playEndChime(): void {
  const AudioCtx = window.AudioContext
  if (typeof AudioCtx !== 'function') return

  try {
    const ctx = new AudioCtx()
    const tones = [660, 880]
    tones.forEach((frequency, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + i * 0.18
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.62)
    })
    setTimeout(() => void ctx.close(), 1200)
  } catch {
    // Autoplay policies can block audio; the visual "Time's up" state still shows.
  }
}
