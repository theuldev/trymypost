let audioContext: AudioContext | null = null;

/**
 * Cria/reativa o AudioContext. Deve ser chamado dentro de um gesto do
 * usuário (ex.: clique no botão Gerar) para a política de autoplay
 * permitir tocar sons depois, mesmo com a aba em background.
 */
export function primeAudio() {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    // Áudio indisponível — ignora silenciosamente.
  }
}

/**
 * Toca um chime curto de sucesso usando Web Audio API
 * (sem necessidade de arquivo de áudio).
 */
export function playSuccessSound() {
  try {
    primeAudio();
    const ctx = audioContext;
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
    const startAt = ctx.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      const start = startAt + index * 0.1;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.45);
    });
  } catch {
    // Áudio indisponível (permissão/autoplay policy) — ignora silenciosamente.
  }
}
