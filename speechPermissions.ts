/**
 * Utilities for microphone permissions, browser support, and SpeechRecognition error categorization.
 */

export interface MicSupportCheck {
  isSupported: boolean;
  isSecureContext: boolean;
  hasSpeechRecognition: boolean;
  hasMediaDevices: boolean;
  inIframe: boolean;
  errorMessage?: string;
}

/**
 * Checks whether the current browser and context support microphone access and Web Speech API.
 */
export function checkMicrophoneSupport(): MicSupportCheck {
  const isClient = typeof window !== 'undefined';
  const isSecureContext = isClient ? window.isSecureContext : true;
  const hasSpeechRecognition = isClient && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const inIframe = isClient && window.self !== window.top;

  if (!isSecureContext && isClient && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return {
      isSupported: false,
      isSecureContext,
      hasSpeechRecognition,
      hasMediaDevices,
      inIframe,
      errorMessage: 'Microphone access requires a secure HTTPS or localhost connection.',
    };
  }

  if (!hasSpeechRecognition) {
    return {
      isSupported: false,
      isSecureContext,
      hasSpeechRecognition,
      hasMediaDevices,
      inIframe,
      errorMessage: 'Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or enter requirements manually.',
    };
  }

  return {
    isSupported: true,
    isSecureContext,
    hasSpeechRecognition,
    hasMediaDevices,
    inIframe,
  };
}

/**
 * Categorizes and formats errors from getUserMedia and SpeechRecognition with distinct, helpful user guidance.
 */
export function formatSpeechError(error: any, inIframe = false): string {
  const errorKey = typeof error === 'string' ? error : error?.name || error?.error || '';

  // 1. Permission Denials
  if (
    errorKey === 'NotAllowedError' ||
    errorKey === 'PermissionDeniedError' ||
    errorKey === 'not-allowed'
  ) {
    if (inIframe) {
      return 'Microphone permission was denied or blocked by the preview frame. Ensure microphone access is allowed in your browser address bar, or open the app in a standalone window.';
    }
    return 'Microphone permission was denied. Please click the microphone / lock icon in your browser address bar and select "Allow".';
  }

  // 2. Iframe / Security Policy restrictions
  if (errorKey === 'SecurityError') {
    return 'Microphone access is blocked by browser security policy or iframe sandbox restrictions.';
  }

  // 3. Service / Network restrictions
  if (errorKey === 'service-not-allowed') {
    return 'Speech recognition service is restricted by your browser, operating system policy, or network firewall.';
  }

  // 4. No microphone hardware
  if (errorKey === 'NotFoundError' || errorKey === 'DevicesNotFoundError') {
    return 'No microphone device was detected. Please plug in or enable an audio input device.';
  }

  // 5. Hardware already in use
  if (errorKey === 'NotReadableError' || errorKey === 'TrackStartError') {
    return 'Your microphone is currently in use by another application or Windows audio service.';
  }

  // 6. Speech recognition specifics
  if (errorKey === 'no-speech') {
    return 'No speech detected. Please speak closer to your microphone and try again.';
  }

  if (errorKey === 'audio-capture') {
    return 'Failed to capture audio from your microphone. Please check your system input settings.';
  }

  if (errorKey === 'network') {
    return 'Network error connecting to speech recognition service. Please check your internet connection or type your requirements.';
  }

  if (errorKey === 'language-not-supported') {
    return 'The chosen language is not supported by your browser speech engine. Try switching to English or Tamil.';
  }

  if (errorKey === 'aborted') {
    return '';
  }

  return typeof error === 'string'
    ? error
    : error?.message || 'Unable to capture speech recognition. Please enter your requirements manually.';
}
