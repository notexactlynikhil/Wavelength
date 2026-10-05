/**
 * Wavelength Customer Recording Disclosure Module
 * Manages loading and playing the preloaded offline TTS audio announcement:
 * "This call is being recorded for quality and training purposes."
 *
 * Automatically routes disclosure into local playback and recording path.
 */

class DisclosureManager {
  constructor() {
    this.audioBuffer = null;
  }

  /**
   * Load bundled TTS WAV disclosure asset
   */
  async loadAudio(audioCtx) {
    if (this.audioBuffer) return this.audioBuffer;

    try {
      const audioUrl = chrome.runtime.getURL('assets/recording-disclosure.wav');
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      if (audioCtx) {
        this.audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      }
      return this.audioBuffer;
    } catch (e) {
      console.warn('Error loading or decoding disclosure audio buffer:', e);
      return null;
    }
  }

  /**
   * Play disclosure audio into local speakers and recording destination
   * @param {AudioContext} audioCtx
   * @param {AudioNode} recordingInputNode Optional node to record disclosure into file
   */
  async playLocalAndRecord(audioCtx, recordingInputNode = null) {
    if (!audioCtx) return;

    try {
      const buffer = await this.loadAudio(audioCtx);
      if (!buffer) return;

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      // 1. Route to salesperson speakers
      source.connect(audioCtx.destination);

      // 2. Route to recording input if provided (so announcement is captured in recording)
      if (recordingInputNode) {
        source.connect(recordingInputNode);
      }

      source.start(0);

      // Await playback duration
      return new Promise((resolve) => {
        source.onended = resolve;
        setTimeout(resolve, (buffer.duration + 0.3) * 1000);
      });
    } catch (err) {
      console.warn('Local disclosure playback error:', err);
    }
  }
}

if (typeof window !== 'undefined') {
  window.disclosureManager = new DisclosureManager();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DisclosureManager };
}
