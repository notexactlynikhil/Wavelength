/**
 * Wavelength Microphone Permission Handler
 */

document.getElementById('requestBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('statusMessage');
  const btn = document.getElementById('requestBtn');

  try {
    btn.disabled = true;
    btn.textContent = 'Requesting access...';

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop tracks immediately after permission is confirmed
    stream.getTracks().forEach((track) => track.stop());

    statusDiv.className = 'status success';
    statusDiv.textContent = 'Microphone permission granted successfully! You can close this tab and return to your meeting.';
    btn.textContent = 'Permission Granted';
    
    // Notify background or popup
    chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' });

    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Microphone permission error:', error);
    btn.disabled = false;
    btn.textContent = 'Retry Grant Access';
    statusDiv.className = 'status error';
    statusDiv.textContent = `Permission denied: ${error.message || error.name}. Please allow microphone access in your browser settings.`;
  }
});
