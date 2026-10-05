/**
 * Wavelength Audio Mixer Module
 * Manages 48kHz Web Audio context, live playback preservation,
 * strict source isolation (SALESPERSON_MIC on Channel 0, REMOTE_AUDIO on Channel 1),
 * and connects real-time SpeakerSegmenter VAD analysis.
 */

class AudioMixer {
  constructor() {
    this.audioCtx = null;
    this.tabSource = null;
    this.micSource = null;
    this.tabStream = null;
    this.micStream = null;
    this.mixedStream = null;
    this.merger = null;
    this.recDestination = null;
    this.segmenter = null;
  }

  async initialize(tabStream, micStream, onEnergyUpdate = null) {
    this.tabStream = tabStream;
    this.micStream = micStream;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 48000,
      latencyHint: 'interactive'
    });

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.tabSource = this.audioCtx.createMediaStreamSource(this.tabStream);
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);

    // 1. LIVE PLAYBACK PRESERVATION:
    // Route tab audio back to speaker destination so salesperson hears meeting normally.
    this.tabSource.connect(this.audioCtx.destination);

    // 2. ISOLATED SOURCE GAIN NODES:
    // SOURCE A: SALESPERSON_MIC -> Mono clamped gain -> Channel 0 (Left)
    this.micGain = this.audioCtx.createGain();
    this.micGain.channelCount = 1;
    this.micGain.channelCountMode = 'clamped-max';
    this.micGain.channelInterpretation = 'speakers';
    this.micSource.connect(this.micGain);

    // SOURCE B: REMOTE_AUDIO -> Mono clamped gain (sums L+R cleanly) -> Channel 1 (Right)
    const tabGain = this.audioCtx.createGain();
    tabGain.channelCount = 1;
    tabGain.channelCountMode = 'clamped-max';
    tabGain.channelInterpretation = 'speakers';
    this.tabSource.connect(tabGain);

    // 3. STEREO CHANNEL MERGER (Ch 0: SALESPERSON_MIC, Ch 1: REMOTE_AUDIO)
    this.merger = this.audioCtx.createChannelMerger(2);
    this.micGain.connect(this.merger, 0, 0);
    tabGain.connect(this.merger, 0, 1);

    // 4. DESTINATION FOR MEDIA RECORDER
    this.recDestination = this.audioCtx.createMediaStreamDestination();
    this.merger.connect(this.recDestination);
    this.mixedStream = this.recDestination.stream;

    // 5. ATTACH REAL-TIME SPEAKER SEGMENTER
    if (window.SpeakerSegmenter) {
      this.segmenter = new window.SpeakerSegmenter();
      this.segmenter.attach(this.audioCtx, this.micGain, tabGain);
      if (onEnergyUpdate) {
        this.segmenter.onEnergyUpdate = onEnergyUpdate;
      }
      this.segmenter.start();
    }

    return this.mixedStream;
  }

  getAudioContext() {
    return this.audioCtx;
  }

  getMixedStream() {
    return this.mixedStream;
  }

  getMicInputNode() {
    return this.micGain;
  }

  getCurrentEnergy() {
    return this.segmenter ? this.segmenter.getCurrentEnergy() : { mic: 0, remote: 0, speaker: 'SILENCE' };
  }

  stopSegmentation() {
    if (this.segmenter) {
      return this.segmenter.stop();
    }
    return { timeline: [], stats: {} };
  }

  cleanup() {
    if (this.segmenter) {
      this.segmenter.stop();
      this.segmenter = null;
    }
    if (this.tabStream) {
      this.tabStream.getTracks().forEach((t) => t.stop());
      this.tabStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.mixedStream) {
      this.mixedStream.getTracks().forEach((t) => t.stop());
      this.mixedStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

if (typeof window !== 'undefined') {
  window.AudioMixer = AudioMixer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioMixer };
}
