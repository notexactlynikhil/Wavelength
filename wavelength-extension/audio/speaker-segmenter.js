/**
 * Wavelength Speaker Segmentation & Voice Activity Detection (VAD) Engine
 * Analyzes isolated SALESPERSON_MIC and REMOTE_AUDIO channels in real-time.
 * Generates an accurate timestamped speaker attribution timeline (SALESPERSON, REMOTE, OVERLAP, SILENCE).
 */

class SpeakerSegmenter {
  constructor(options = {}) {
    this.audioCtx = null;
    this.micAnalyser = null;
    this.remoteAnalyser = null;
    this.sampleIntervalMs = options.sampleIntervalMs || 50;
    this.vadThreshold = options.vadThreshold || 0.018; // RMS energy threshold
    this.minSegmentDurationSec = options.minSegmentDurationSec || 0.2; // 200ms minimum to prevent micro-jitter

    this.timer = null;
    this.startTime = null;
    this.rawIntervals = [];
    this.currentEnergy = { mic: 0, remote: 0, speaker: 'SILENCE' };
    this.onEnergyUpdate = null; // optional callback for live UI meters
  }

  /**
   * Attach analyzer nodes to isolated audio source nodes
   */
  attach(audioCtx, micSourceNode, remoteSourceNode) {
    this.audioCtx = audioCtx;

    // Mic Analyser Node
    this.micAnalyser = this.audioCtx.createAnalyser();
    this.micAnalyser.fftSize = 512;
    this.micAnalyser.smoothingTimeConstant = 0.3;
    micSourceNode.connect(this.micAnalyser);

    // Remote Analyser Node
    this.remoteAnalyser = this.audioCtx.createAnalyser();
    this.remoteAnalyser.fftSize = 512;
    this.remoteAnalyser.smoothingTimeConstant = 0.3;
    remoteSourceNode.connect(this.remoteAnalyser);
  }

  /**
   * Start real-time energy sampling
   */
  start() {
    this.rawIntervals = [];
    this.startTime = Date.now();

    const micBuffer = new Float32Array(this.micAnalyser.fftSize);
    const remoteBuffer = new Float32Array(this.remoteAnalyser.fftSize);

    this.timer = setInterval(() => {
      if (!this.micAnalyser || !this.remoteAnalyser) return;

      this.micAnalyser.getFloatTimeDomainData(micBuffer);
      this.remoteAnalyser.getFloatTimeDomainData(remoteBuffer);

      const micRms = this.computeRMS(micBuffer);
      const remoteRms = this.computeRMS(remoteBuffer);

      const isMicActive = micRms > this.vadThreshold;
      const isRemoteActive = remoteRms > this.vadThreshold;

      let speaker = 'SILENCE';
      if (isMicActive && isRemoteActive) {
        speaker = 'OVERLAP';
      } else if (isMicActive) {
        speaker = 'SALESPERSON';
      } else if (isRemoteActive) {
        speaker = 'REMOTE';
      }

      const elapsedSec = (Date.now() - this.startTime) / 1000;

      this.currentEnergy = {
        mic: Math.min(1.0, micRms * 12),
        remote: Math.min(1.0, remoteRms * 12),
        speaker
      };

      this.rawIntervals.push({
        timeSec: elapsedSec,
        speaker,
        micRms,
        remoteRms
      });

      if (this.onEnergyUpdate) {
        this.onEnergyUpdate(this.currentEnergy);
      }
    }, this.sampleIntervalMs);
  }

  computeRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  getCurrentEnergy() {
    return this.currentEnergy;
  }

  /**
   * Stop sampling and compute structured speaker timeline
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    return this.generateTimeline();
  }

  /**
   * Condenses raw intervals into merged, contiguous speaker segments
   */
  generateTimeline() {
    if (this.rawIntervals.length === 0) {
      return {
        timeline: [],
        stats: {
          totalDurationSec: 0,
          salespersonDurationSec: 0,
          remoteDurationSec: 0,
          overlapDurationSec: 0,
          silenceDurationSec: 0,
          salespersonPercent: 0,
          remotePercent: 0,
          overlapPercent: 0,
          silencePercent: 0
        }
      };
    }

    const merged = [];
    let currentSegment = null;

    for (let i = 0; i < this.rawIntervals.length; i++) {
      const sample = this.rawIntervals[i];

      if (!currentSegment) {
        currentSegment = {
          speaker: sample.speaker,
          startSec: sample.timeSec,
          endSec: sample.timeSec,
          energySum: sample.speaker === 'SALESPERSON' ? sample.micRms : sample.remoteRms,
          sampleCount: 1
        };
      } else if (currentSegment.speaker === sample.speaker) {
        currentSegment.endSec = sample.timeSec;
        currentSegment.energySum += sample.speaker === 'SALESPERSON' ? sample.micRms : sample.remoteRms;
        currentSegment.sampleCount++;
      } else {
        // Close previous segment
        merged.push({
          speaker: currentSegment.speaker,
          startSec: Number(currentSegment.startSec.toFixed(2)),
          endSec: Number(currentSegment.endSec.toFixed(2)),
          durationSec: Number((currentSegment.endSec - currentSegment.startSec).toFixed(2)),
          avgEnergy: Number((currentSegment.energySum / currentSegment.sampleCount).toFixed(3))
        });

        currentSegment = {
          speaker: sample.speaker,
          startSec: sample.timeSec,
          endSec: sample.timeSec,
          energySum: sample.speaker === 'SALESPERSON' ? sample.micRms : sample.remoteRms,
          sampleCount: 1
        };
      }
    }

    if (currentSegment) {
      merged.push({
        speaker: currentSegment.speaker,
        startSec: Number(currentSegment.startSec.toFixed(2)),
        endSec: Number(currentSegment.endSec.toFixed(2)),
        durationSec: Number((currentSegment.endSec - currentSegment.startSec).toFixed(2)),
        avgEnergy: Number((currentSegment.energySum / currentSegment.sampleCount).toFixed(3))
      });
    }

    // Filter out negligible micro-silence jitter (<100ms)
    const filteredTimeline = [];
    for (const seg of merged) {
      if (seg.durationSec >= 0.1 || seg.speaker !== 'SILENCE') {
        filteredTimeline.push(seg);
      }
    }

    // Calculate aggregated statistics
    let salespersonSec = 0;
    let remoteSec = 0;
    let overlapSec = 0;
    let silenceSec = 0;

    for (const sample of this.rawIntervals) {
      const dt = this.sampleIntervalMs / 1000;
      if (sample.speaker === 'SALESPERSON') salespersonSec += dt;
      else if (sample.speaker === 'REMOTE') remoteSec += dt;
      else if (sample.speaker === 'OVERLAP') overlapSec += dt;
      else silenceSec += dt;
    }

    const totalSec = Math.max(0.1, salespersonSec + remoteSec + overlapSec + silenceSec);

    const stats = {
      totalDurationSec: Number(totalSec.toFixed(1)),
      salespersonDurationSec: Number(salespersonSec.toFixed(1)),
      remoteDurationSec: Number(remoteSec.toFixed(1)),
      overlapDurationSec: Number(overlapSec.toFixed(1)),
      silenceDurationSec: Number(silenceSec.toFixed(1)),
      salespersonPercent: Number(((salespersonSec / totalSec) * 100).toFixed(1)),
      remotePercent: Number(((remoteSec / totalSec) * 100).toFixed(1)),
      overlapPercent: Number(((overlapSec / totalSec) * 100).toFixed(1)),
      silencePercent: Number(((silenceSec / totalSec) * 100).toFixed(1))
    };

    return {
      timeline: filteredTimeline,
      stats
    };
  }
}

if (typeof window !== 'undefined') {
  window.SpeakerSegmenter = SpeakerSegmenter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpeakerSegmenter };
}
