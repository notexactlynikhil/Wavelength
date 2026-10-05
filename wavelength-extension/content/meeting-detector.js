/**
 * Wavelength Meeting Detector Content Script
 * Bridges communication between extension background and page-world WebRTC injector.
 * Loads extension audio assets and transfers them to page injector to bypass meeting CSP.
 */

(function () {
  'use strict';

  function detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    if (host === 'meet.google.com') {
      const isMeeting = pathname.length > 1 && !pathname.startsWith('/landing') && !pathname.startsWith('/about');
      return {
        platform: 'google_meet',
        platformName: 'Google Meet',
        isMeeting: isMeeting,
        url: window.location.href,
        title: document.title
      };
    }

    if (host.includes('teams.microsoft.com') || host.includes('teams.live.com')) {
      return {
        platform: 'ms_teams',
        platformName: 'Microsoft Teams Web',
        isMeeting: true,
        url: window.location.href,
        title: document.title
      };
    }

    if (host.endsWith('zoom.us') || host.includes('zoom.us')) {
      return {
        platform: 'zoom',
        platformName: 'Zoom Web',
        isMeeting: pathname.includes('/wc/') || pathname.includes('/j/') || pathname.includes('/s/'),
        url: window.location.href,
        title: document.title
      };
    }

    return {
      platform: 'generic_tab',
      platformName: 'Browser Tab',
      isMeeting: false,
      url: window.location.href,
      title: document.title
    };
  }

  // Ping page-world injector to check hook status
  async function checkPageInjectorHook() {
    return new Promise((resolve) => {
      let resolved = false;

      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.target !== 'ECHOCRM_CONTENT') return;
        if (event.data.type === 'ECHOCRM_PONG') {
          window.removeEventListener('message', handler);
          resolved = true;
          resolve({
            hookActive: Boolean(event.data.hookActive),
            hasAudioContext: Boolean(event.data.hasAudioContext)
          });
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({ target: 'ECHOCRM_PAGE', type: 'ECHOCRM_PING' }, '*');

      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('message', handler);
          resolve({ hookActive: false, hasAudioContext: false, timeout: true });
        }
      }, 500);
    });
  }

  // Load disclosure WAV in extension isolated world and send raw bytes to page injector
  async function injectRemoteDisclosure() {
    return new Promise(async (resolve) => {
      let resolved = false;

      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.target !== 'ECHOCRM_CONTENT') return;
        if (event.data.type === 'ECHOCRM_DISCLOSURE_RESULT') {
          window.removeEventListener('message', handler);
          resolved = true;
          resolve(event.data.result);
        }
      };

      window.addEventListener('message', handler);

      try {
        const audioUrl = chrome.runtime.getURL('assets/recording-disclosure.wav');
        const res = await fetch(audioUrl);
        const arrayBuf = await res.arrayBuffer();
        const byteArr = Array.from(new Uint8Array(arrayBuf));

        window.postMessage({
          target: 'ECHOCRM_PAGE',
          type: 'ECHOCRM_INJECT_DISCLOSURE',
          audioBytes: byteArr
        }, '*');
      } catch (fetchErr) {
        window.removeEventListener('message', handler);
        resolve({
          delivered: false,
          reason: 'ASSET_LOAD_ERROR',
          details: fetchErr.message
        });
        return;
      }

      // Safety timeout: 6.0 seconds for full 4.20s TTS playback
      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('message', handler);
          resolve({
            delivered: false,
            reason: 'INJECTION_TIMEOUT',
            details: 'Page injector timed out or hook is inactive.'
          });
        }
      }, 6000);
    });
  }

  // Respond to extension runtime messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === 'GET_MEETING_INFO') {
      const info = detectPlatform();
      checkPageInjectorHook().then((hookStatus) => {
        sendResponse({ ...info, injector: hookStatus });
      });
      return true; // async
    }

    if (message.type === 'TRIGGER_REMOTE_DISCLOSURE') {
      injectRemoteDisclosure().then((result) => {
        sendResponse(result);
      });
      return true; // async
    }

    return true;
  });

  // Auto-start recording logic
  const platformInfo = detectPlatform();
  if (platformInfo.isMeeting) {
    // Wait briefly for page to settle
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'MEETING_JOINED',
        payload: {
          platform: platformInfo.platform,
          meetingUrl: platformInfo.url
        }
      }).catch(() => {});
    }, 2000);
  }

  // Best-effort detection for meeting tab unload
  window.addEventListener('beforeunload', () => {
    try {
      chrome.runtime.sendMessage({
        type: 'MEETING_TAB_UNLOADED',
        url: window.location.href
      });
    } catch (e) {}
  });
})();
