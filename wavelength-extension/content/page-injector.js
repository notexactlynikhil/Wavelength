/**
 * Wavelength Page-World WebRTC Microphone Injector
 * Runs in the MAIN execution world at document_start.
 * Intercepts navigator.mediaDevices.getUserMedia() and RTCPeerConnection to route outgoing meeting audio
 * through an AudioContext destination, enabling genuine remote participant disclosure across Google Meet, Teams, and Zoom.
 */

(function () {
  'use strict';

  if (window.__ECHOCRM_INJECTOR_ACTIVE__) return;
  window.__ECHOCRM_INJECTOR_ACTIVE__ = true;

  let originalGetUserMedia = null;
  let activeAudioCtx = null;
  let activeMicSource = null;
  let activeDestination = null;
  let injectionGainNode = null;
  let isHookActive = false;

  function ensureAudioPipeline(rawStream) {
    try {
      if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
        activeAudioCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000,
          latencyHint: 'interactive'
        });
      }

      if (activeAudioCtx.state === 'suspended') {
        activeAudioCtx.resume().catch(() => {});
      }

      activeMicSource = activeAudioCtx.createMediaStreamSource(rawStream);
      activeDestination = activeAudioCtx.createMediaStreamDestination();

      // Pass-through gain for salesperson normal speech
      const passThroughGain = activeAudioCtx.createGain();
      passThroughGain.gain.value = 1.0;
      activeMicSource.connect(passThroughGain);
      passThroughGain.connect(activeDestination);

      // Injection gain node for disclosure audio (boosted for clear WebRTC transmission)
      injectionGainNode = activeAudioCtx.createGain();
      injectionGainNode.gain.value = 2.0;
      injectionGainNode.connect(activeDestination);

      isHookActive = true;

      // Replace audio track with the mixed destination track
      const mixedTrack = activeDestination.stream.getAudioTracks()[0];
      const audioTracks = rawStream.getAudioTracks();

      // Forward track lifecycle events (mute/unmute/ended)
      if (audioTracks[0]) {
        audioTracks[0].addEventListener('ended', () => {
          isHookActive = false;
        });
        audioTracks[0].addEventListener('mute', () => {
          mixedTrack.enabled = false;
        });
        audioTracks[0].addEventListener('unmute', () => {
          mixedTrack.enabled = true;
        });
      }

      return new MediaStream([mixedTrack, ...rawStream.getVideoTracks()]);
    } catch (err) {
      console.warn('[Wavelength] Audio pipeline error, falling back to raw stream:', err);
      return rawStream;
    }
  }

  // Intercept getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function (constraints) {
      if (!constraints || !constraints.audio) {
        return originalGetUserMedia(constraints);
      }

      try {
        const rawStream = await originalGetUserMedia(constraints);
        if (rawStream.getAudioTracks().length === 0) {
          return rawStream;
        }
        return ensureAudioPipeline(rawStream);
      } catch (err) {
        throw err;
      }
    };
  }

  // Handle messages from content script (isolated world)
  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.target !== 'ECHOCRM_PAGE') return;

    if (event.data.type === 'ECHOCRM_PING') {
      window.postMessage({
        target: 'ECHOCRM_CONTENT',
        type: 'ECHOCRM_PONG',
        hookActive: isHookActive,
        hasAudioContext: Boolean(activeAudioCtx)
      }, '*');
      return;
    }

    if (event.data.type === 'ECHOCRM_INJECT_DISCLOSURE') {
      const rawBytes = event.data.audioBytes;
      const disclosureResult = await transmitDisclosureAudioData(rawBytes);
      window.postMessage({
        target: 'ECHOCRM_CONTENT',
        type: 'ECHOCRM_DISCLOSURE_RESULT',
        result: disclosureResult
      }, '*');
    }
  });

  async function transmitDisclosureAudioData(rawBytes) {
    if (!isHookActive || !activeAudioCtx || !injectionGainNode) {
      return {
        delivered: false,
        reason: 'HOOK_INACTIVE',
        details: 'Meeting audio track was not intercepted. Reloading the meeting tab will activate the WebRTC injector.'
      };
    }

    try {
      if (activeAudioCtx.state === 'suspended') {
        await activeAudioCtx.resume();
      }

      let arrayBuffer;
      if (rawBytes instanceof ArrayBuffer) {
        arrayBuffer = rawBytes;
      } else if (Array.isArray(rawBytes)) {
        arrayBuffer = new Uint8Array(rawBytes).buffer;
      } else {
        throw new Error('Invalid audio data format passed to page injector.');
      }

      // Decode audio data inside page context
      const decodedBuffer = await activeAudioCtx.decodeAudioData(arrayBuffer);

      const bufferSource = activeAudioCtx.createBufferSource();
      bufferSource.buffer = decodedBuffer;
      bufferSource.connect(injectionGainNode);

      return new Promise((resolve) => {
        bufferSource.onended = () => {
          console.log('[Wavelength] Disclosure audio finished playing into meeting WebRTC track.');
          resolve({
            delivered: true,
            reason: 'TRANSMITTED_TO_WEBRTC_TRACK',
            timestamp: new Date().toISOString()
          });
        };

        bufferSource.start(0);

        // Safety timeout
        setTimeout(() => {
          resolve({
            delivered: true,
            reason: 'TRANSMITTED_TIMEOUT_FALLBACK',
            timestamp: new Date().toISOString()
          });
        }, (decodedBuffer.duration + 0.5) * 1000);
      });
    } catch (err) {
      console.error('[Wavelength] Failed to play disclosure into WebRTC track:', err);
      return {
        delivered: false,
        reason: 'TRANSMISSION_ERROR',
        details: err.message || String(err)
      };
    }
  }

  console.log('[Wavelength] Page-world WebRTC audio injector active.');
})();
