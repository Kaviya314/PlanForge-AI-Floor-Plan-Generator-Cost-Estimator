import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Languages,
  ArrowRight,
  Info
} from 'lucide-react';
import { parseSpokenRequirements, ParsedSpeechRequirements } from '../utils/speechParser';
import { checkMicrophoneSupport, formatSpeechError } from '../utils/speechPermissions';

// Browser Web Speech Recognition declaration
type SpeechRecognitionType = any;

interface VoiceToBlueprintProps {
  value?: string;
  onChange?: (text: string) => void;
  onApplyRequirements?: (parsed: ParsedSpeechRequirements) => void;
  onQuickGenerate?: () => void;
  disabled?: boolean;
  onClose?: () => void;
}

export type VoiceState = 'idle' | 'listening' | 'recognized' | 'error';

export const VoiceToBlueprint: React.FC<VoiceToBlueprintProps> = ({
  value = '',
  onChange = () => {},
  onApplyRequirements,
  onQuickGenerate,
  disabled = false,
  onClose,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en-IN' | 'ta-IN'>('en-IN');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Audio waveform animation references
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check browser speech recognition support
  useEffect(() => {
    const check = checkMicrophoneSupport();
    if (!check.isSupported) {
      setIsSupported(false);
      if (check.errorMessage) {
        setErrorMessage(check.errorMessage);
      }
    }
  }, []);

  // Compute parsed tags from current value in real time
  const parsedSpecs = React.useMemo(() => {
    return parseSpokenRequirements(value);
  }, [value]);

  // Clean up audio streams and recognition on unmount
  const stopAudioCapture = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  // Waveform drawing loop
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average energy level
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const avg = sum / bufferLength;
    setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw modern audio frequency bars
    const barWidth = 3;
    const gap = 3;
    const barCount = Math.floor(width / (barWidth + gap));
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.min(bufferLength - 1, i * step);
      const val = dataArray[dataIndex] || 0;
      const barHeight = Math.max(3, (val / 255) * (height - 6));
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      // Restrained teal gradient
      ctx.fillStyle = val > 140 ? '#0D9488' : '#0F766E';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  // Start Voice Recognition
  const startListening = async () => {
    setErrorMessage(null);
    setInterimTranscript('');

    const check = checkMicrophoneSupport();
    if (!check.isSupported) {
      setIsSupported(false);
      setErrorMessage(
        check.errorMessage ||
          'Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or enter requirements manually.'
      );
      setVoiceState('error');
      return;
    }

    // Initialize Web Audio for real-time visualizer on user gesture
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Start drawing waveform
        if (canvasRef.current) {
          canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 240;
          canvasRef.current.height = 36;
        }
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      }
    } catch (mediaErr: any) {
      console.warn('Microphone audio stream notice:', mediaErr?.message || mediaErr);
      setErrorMessage(formatSpeechError(mediaErr, window.self !== window.top));
      setVoiceState('error');
      return;
    }

    // Initialize SpeechRecognition
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTrans += transcriptChunk;
          } else {
            interim += transcriptChunk;
          }
        }

        if (finalTrans) {
          // Append final speech to existing value cleanly
          const updated = value.trim() ? `${value.trim()} ${finalTrans.trim()}` : finalTrans.trim();
          onChange(updated);
          setInterimTranscript('');
          setVoiceState('recognized');
        } else if (interim) {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        stopAudioCapture();

        if (event.error === 'aborted') {
          return;
        }

        setErrorMessage(formatSpeechError(event.error, window.self !== window.top));
        setVoiceState('error');
      };

      recognition.onend = () => {
        stopAudioCapture();
        setVoiceState((prev) => (prev === 'listening' ? 'recognized' : prev));
      };

      recognition.start();
    } catch (err: any) {
      stopAudioCapture();
      setErrorMessage(formatSpeechError(err, window.self !== window.top));
      setVoiceState('error');
    }
  };

  // Stop Voice Recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopAudioCapture();
    if (interimTranscript) {
      const updated = value.trim()
        ? `${value.trim()} ${interimTranscript.trim()}`
        : interimTranscript.trim();
      onChange(updated);
      setInterimTranscript('');
    }
    setVoiceState('recognized');
  };

  // Clear Text
  const handleClear = () => {
    stopListening();
    onChange('');
    setInterimTranscript('');
    setErrorMessage(null);
    setVoiceState('idle');
  };

  // Apply parsed speech specs to the main form
  const handleApplySpecs = () => {
    if (onApplyRequirements && parsedSpecs) {
      onApplyRequirements(parsedSpecs);
    }
  };

  // Insert Quick Spoken Sample for testing
  const handleSampleClick = (sample: string) => {
    onChange(sample);
    setVoiceState('recognized');
    setErrorMessage(null);
  };

  return (
    <div className="rounded-2xl border border-[#E7E5E0] bg-[#FAF9F6] p-4 sm:p-5 transition-all">
      {/* Header Bar: Title, Language Switcher, and Voice State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EFEA]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E]">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#18191C] uppercase tracking-wider">
                Voice-to-Blueprint
              </span>
              <span className="text-[10px] font-medium bg-[#0F766E]/10 text-[#0F766E] px-2 py-0.5 rounded-full">
                Speech-to-Plan
              </span>
            </div>
            <p className="text-[11px] text-[#71717A]">
              Speak your dream house requirements naturally in English or Tamil
            </p>
          </div>
        </div>

        {/* Language Selection & Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Language Selector */}
          <div className="flex items-center bg-white border border-[#E7E5E0] rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setLanguage('en-IN');
                if (voiceState === 'listening') stopListening();
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1 ${
                language === 'en-IN'
                  ? 'bg-[#18191C] text-white'
                  : 'text-[#71717A] hover:text-[#18191C]'
              }`}
            >
              <span>English</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguage('ta-IN');
                if (voiceState === 'listening') stopListening();
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1 ${
                language === 'ta-IN'
                  ? 'bg-[#18191C] text-white'
                  : 'text-[#71717A] hover:text-[#18191C]'
              }`}
            >
              <span>தமிழ் (Tamil)</span>
            </button>
          </div>

          {/* Voice State Indicator */}
          {voiceState === 'listening' && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              Listening...
            </span>
          )}
          {voiceState === 'recognized' && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Recognized
            </span>
          )}
        </div>
      </div>

      {/* Main Microphone Action & Waveform Canvas Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Prominent High-Contrast Microphone Button */}
        {voiceState === 'listening' ? (
          <button
            type="button"
            onClick={stopListening}
            className="flex-shrink-0 h-12 px-5 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
            aria-label="Stop speech recording"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop Recording</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startListening}
            disabled={disabled}
            className="flex-shrink-0 h-12 px-5 rounded-xl font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] active:scale-[0.98] transition flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-50"
            aria-label="Start voice-to-blueprint speech recording"
          >
            <Mic className="w-4 h-4" />
            <span>Start Voice Input</span>
          </button>
        )}

        {/* Waveform / Visualizer Dock */}
        <div className="flex-1 min-h-[48px] rounded-xl bg-white border border-[#E7E5E0] px-4 py-1.5 flex items-center justify-between gap-3 overflow-hidden">
          {voiceState === 'listening' ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-semibold text-[#18191C]">
                  {language === 'ta-IN' ? 'பேசுங்கள்...' : 'Listening to voice...'}
                </span>
              </div>
              <div className="flex-1 flex justify-center h-8">
                <canvas ref={canvasRef} className="w-full max-w-[280px] h-8" />
              </div>
              <span className="text-[11px] font-mono text-[#0F766E] font-medium hidden sm:inline">
                {audioLevel}% Vol
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-xs text-[#71717A]">
              <span className="truncate">
                {voiceState === 'recognized'
                  ? 'Voice recognized. Review or edit below, then generate your blueprint.'
                  : `Click the microphone to speak your requirements in ${
                      language === 'ta-IN' ? 'Tamil (தமிழ்)' : 'English'
                    }.`}
              </span>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-[#71717A] hover:text-rose-600 transition flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                  title="Clear text"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error & Warning Notification */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {!isSupported && (
              <p className="mt-1 text-[11px] text-rose-700">
                You can still type directly in the field or click the sample spoken requests below.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Editable Natural Language Input Field */}
      <div className="mt-3 relative">
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (voiceState === 'idle' && e.target.value) {
              setVoiceState('recognized');
            }
          }}
          rows={3}
          disabled={disabled}
          placeholder={
            language === 'ta-IN'
              ? 'எடுத்துக்காட்டு: "1200 சதுர அடியில் 3 படுக்கையறைகள், 2 குளியலறைகள், சமையலறை, டைனிங் ஏரியா மற்றும் கார் பார்க்கிங் கொண்ட வீடு."'
              : 'e.g. "Create a 1200 square feet house with three bedrooms, two bathrooms, a kitchen, dining area and car parking."'
          }
          className="w-full px-4 py-3 text-sm bg-white border border-[#E4E4E7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] text-[#18191C] placeholder-[#A1A1AA] transition shadow-2xs"
        />

        {/* Interim streaming text preview if actively listening */}
        {interimTranscript && (
          <div className="absolute left-4 bottom-3 right-4 pointer-events-none text-xs italic text-[#0F766E] bg-white/90 px-1 py-0.5 rounded truncate">
            {interimTranscript}
          </div>
        )}
      </div>

      {/* Detected Architectural Parameters Badges */}
      {parsedSpecs.detectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#F0EFEA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[#18191C] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              Detected from Spoken Request ({parsedSpecs.detectedTags.length} specs)
            </span>

            {onApplyRequirements && (
              <button
                type="button"
                onClick={handleApplySpecs}
                className="text-xs font-semibold text-[#0F766E] hover:text-[#0D9488] bg-teal-50 hover:bg-teal-100/70 border border-teal-200/60 px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Apply Specs to Form</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {parsedSpecs.detectedTags.map((tag) => (
              <span
                key={tag.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-[#E7E5E0] text-[#18191C] shadow-2xs"
              >
                <span className="text-[#71717A] text-[10px] uppercase font-mono">{tag.label}:</span>
                <span className="font-semibold text-[#0F766E]">{tag.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Spoken Samples for Quick Testing & Accessibility */}
      <div className="mt-3 pt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-[#71717A] flex items-center gap-1">
          <Info className="w-3 h-3 text-[#A1A1AA]" />
          Try Spoken Examples:
        </span>
        <button
          type="button"
          onClick={() =>
            handleSampleClick(
              'Create a 1200 sq ft east-facing house with three bedrooms, two bathrooms, an open kitchen, living room, dining area and car parking.'
            )
          }
          className="text-[11px] font-medium text-[#18191C] bg-white hover:bg-[#F4F4F5] border border-[#E7E5E0] px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          1200 sq.ft East-facing 3BHK with parking (EN)
        </button>
        <button
          type="button"
          onClick={() =>
            handleSampleClick(
              '1200 சதுர அடியில் 3 படுக்கையறைகள், 2 குளியலறைகள், சமையலறை, டைனிங் ஏரியா மற்றும் கார் பார்க்கிங் கொண்ட வீடு.'
            )
          }
          className="text-[11px] font-medium text-[#18191C] bg-white hover:bg-[#F4F4F5] border border-[#E7E5E0] px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          1200 சதுர அடி 3BHK கார் பார்க்கிங் (தமிழ்)
        </button>
        <button
          type="button"
          onClick={() =>
            handleSampleClick(
              'A 30 by 40 feet plot with two bedrooms, two bathrooms, modern open kitchen, living room and sit-out balcony.'
            )
          }
          className="text-[11px] font-medium text-[#18191C] bg-white hover:bg-[#F4F4F5] border border-[#E7E5E0] px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          30×40 ft 2BHK with balcony (EN)
        </button>
      </div>
    </div>
  );
};
