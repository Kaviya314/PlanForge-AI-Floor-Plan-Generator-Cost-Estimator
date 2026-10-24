import React, { useState, useRef, useEffect } from 'react';
import { GeneratePlanRequest, MeasurementUnit } from '../types/plan';
import {
  Home,
  Mic,
  RotateCcw,
  Sparkles,
  Check,
  ChevronDown,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { VoiceToBlueprint } from './VoiceToBlueprint';
import { ParsedSpeechRequirements } from '../utils/speechParser';
import { checkMicrophoneSupport, formatSpeechError } from '../utils/speechPermissions';

interface PlanFormProps {
  onSubmit: (req: GeneratePlanRequest) => Promise<void>;
  isLoading: boolean;
  aiConfigured: boolean;
}

export const PlanForm: React.FC<PlanFormProps> = ({ onSubmit, isLoading, aiConfigured }) => {
  const [naturalPrompt, setNaturalPrompt] = useState<string>(
    'Create a 1200 sq ft east-facing house with three bedrooms, two bathrooms, an open kitchen, living room, dining area and car parking.'
  );
  const [projectName, setProjectName] = useState<string>('3BHK Home');
  const [buildingType, setBuildingType] = useState<string>('House');
  const [plotDimensions, setPlotDimensions] = useState<string>('30 x 40 ft');
  const [plotWidth, setPlotWidth] = useState<number>(30);
  const [plotLength, setPlotLength] = useState<number>(40);
  const [unit, setUnit] = useState<MeasurementUnit>('ft');
  const [floors, setFloors] = useState<number>(1);
  const [budgetRange, setBudgetRange] = useState<string>('₹ 15 - 25 Lakhs');
  const [budgetInr, setBudgetInr] = useState<number>(1602000);

  // Room requirements derived
  const [houseType, setHouseType] = useState<string>('3BHK');
  const [numBedrooms, setNumBedrooms] = useState<number>(3);
  const [numBathrooms, setNumBathrooms] = useState<number>(2);
  const [numKitchens, setNumKitchens] = useState<number>(1);
  const [numLivingRooms, setNumLivingRooms] = useState<number>(1);
  const [hasDining, setHasDining] = useState<boolean>(true);
  const [hasParking, setHasParking] = useState<boolean>(true);
  const [hasBalcony, setHasBalcony] = useState<boolean>(false);

  // Voice & Input mode
  const [inputTab, setInputTab] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Quick Examples from reference image
  const quickExamples = [
    {
      title: '3 Bedroom House',
      desc: '1200 sq ft | 2 Bathrooms',
      prompt: 'Create a 1200 sq ft east-facing house with three bedrooms, two bathrooms, open kitchen, living room, dining area and car parking.',
      width: 30,
      length: 40,
      type: '3BHK',
      beds: 3,
      baths: 2,
      parking: true,
      dining: true,
      budget: 1602000,
      dimStr: '30 x 40 ft',
    },
    {
      title: '2 BHK Apartment',
      desc: '800 sq ft | Modern Design',
      prompt: 'A modern 800 sq ft 2BHK apartment with master bedroom, guest bedroom, 2 bathrooms, open living and modular kitchen.',
      width: 25,
      length: 32,
      type: '2BHK',
      beds: 2,
      baths: 2,
      parking: false,
      dining: true,
      budget: 1250000,
      dimStr: '25 x 35 ft',
    },
    {
      title: 'Single Floor Home',
      desc: '1000 sq ft | East Facing',
      prompt: 'A single floor 1000 sq ft contemporary home with 2 bedrooms, 2 baths, front porch parking and spacious living area.',
      width: 25,
      length: 40,
      type: '2BHK',
      beds: 2,
      baths: 2,
      parking: true,
      dining: true,
      budget: 1450000,
      dimStr: '25 x 40 ft',
    },
    {
      title: 'Small House',
      desc: '600 sq ft | 1 Bedroom',
      prompt: 'A compact 600 sq ft 1BHK home with living room, kitchen, attached bath, and efficient utility space.',
      width: 20,
      length: 30,
      type: '1BHK',
      beds: 1,
      baths: 1,
      parking: false,
      dining: false,
      budget: 950000,
      dimStr: '20 x 30 ft',
    },
  ];

  const handleSelectExample = (ex: typeof quickExamples[0]) => {
    setNaturalPrompt(ex.prompt);
    setProjectName(ex.title);
    setPlotWidth(ex.width);
    setPlotLength(ex.length);
    setPlotDimensions(ex.dimStr);
    setHouseType(ex.type);
    setNumBedrooms(ex.beds);
    setNumBathrooms(ex.baths);
    setHasParking(ex.parking);
    setHasDining(ex.dining);
    setBudgetInr(ex.budget);
  };

  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleLanguageChange = (newLang: 'en' | 'ta') => {
    setLanguage(newLang);
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.lang = newLang === 'ta' ? 'ta-IN' : 'en-IN';
    }
  };

  // Direct Web Speech API microphone toggle
  const toggleSpeechRecognition = async () => {
    const support = checkMicrophoneSupport();
    if (!support.isSupported) {
      setSpeechError(support.errorMessage || 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    setSpeechError(null);

    // Request microphone access explicitly on user gesture
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release stream tracks immediately so speech recognition can use the hardware audio interface
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        setSpeechError(formatSpeechError(mediaErr, window.self !== window.top));
        setIsRecording(false);
        return;
      }
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          }
        }
        if (finalTrans) {
          setNaturalPrompt((prev) => (prev.trim() ? `${prev.trim()} ${finalTrans.trim()}` : finalTrans.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'aborted') return;
        setSpeechError(formatSpeechError(event.error, window.self !== window.top));
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (startErr: any) {
      setSpeechError(formatSpeechError(startErr, window.self !== window.top));
      setIsRecording(false);
    }
  };

  const handleApplyVoiceParsed = (parsed: ParsedSpeechRequirements) => {
    if (parsed.plotWidth && parsed.plotLength) {
      setPlotWidth(parsed.plotWidth);
      setPlotLength(parsed.plotLength);
      setPlotDimensions(`${parsed.plotWidth} x ${parsed.plotLength} ft`);
    }
    if (parsed.numBedrooms) {
      setNumBedrooms(parsed.numBedrooms);
      setHouseType(parsed.houseType || `${parsed.numBedrooms}BHK`);
      setProjectName(`${parsed.numBedrooms}BHK Home`);
    }
    if (parsed.numBathrooms) {
      setNumBathrooms(parsed.numBathrooms);
    }
    if (parsed.hasDining !== undefined) {
      setHasDining(parsed.hasDining);
    }
    if (parsed.hasParking !== undefined) {
      setHasParking(parsed.hasParking);
    }
    setShowVoiceModal(false);
  };

  const handlePlotDimensionsChange = (val: string) => {
    setPlotDimensions(val);
    if (val === '20 x 30 ft') {
      setPlotWidth(20);
      setPlotLength(30);
    } else if (val === '25 x 35 ft') {
      setPlotWidth(25);
      setPlotLength(35);
    } else if (val === '30 x 40 ft') {
      setPlotWidth(30);
      setPlotLength(40);
    } else if (val === '40 x 50 ft') {
      setPlotWidth(40);
      setPlotLength(50);
    } else if (val === '40 x 60 ft') {
      setPlotWidth(40);
      setPlotLength(60);
    }
  };

  const handleBudgetRangeChange = (val: string) => {
    setBudgetRange(val);
    if (val.includes('10 - 15')) setBudgetInr(1250000);
    else if (val.includes('15 - 25')) setBudgetInr(1602000);
    else if (val.includes('25 - 40')) setBudgetInr(3200000);
    else if (val.includes('40+')) setBudgetInr(4500000);
  };

  const handleClear = () => {
    setNaturalPrompt('');
    setSpeechError(null);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: GeneratePlanRequest = {
      natural_prompt: naturalPrompt,
      project_name: projectName || '3BHK Home',
      plot_width: plotWidth,
      plot_length: plotLength,
      unit,
      house_type: houseType,
      num_bedrooms: numBedrooms,
      num_bathrooms: numBathrooms,
      num_kitchens: numKitchens,
      num_living_rooms: numLivingRooms,
      has_balcony: hasBalcony,
      has_dining: hasDining,
      has_parking: hasParking,
      has_garden: false,
      floors,
      budget_inr: budgetInr,
    };

    await onSubmit(payload);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in select-none">
      {/* 1. HERO BANNER CARD (Matches Screen 1 in reference image) */}
      <div className="bg-gradient-to-r from-[#EBF3FC] via-[#F3F8FD] to-[#EAF2FC] border border-[#DFEAF5] rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs relative overflow-hidden">
        {/* Left: House Icon, Title & Subtitle */}
        <div className="flex items-start gap-4 max-w-xl z-10">
          <div className="w-12 h-12 rounded-xl bg-[#D7F3F2] border border-teal-200/60 text-[#0D7B75] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Home className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0C1E38]">
              Tell us about your dream home
            </h1>
            <p className="text-xs sm:text-sm text-[#5E718D] mt-1 leading-relaxed">
              Describe your home using text or voice. We'll turn your ideas into a detailed floor, 3D model and cost estimate.
            </p>
          </div>
        </div>

        {/* Right: Architectural Luxury House Render Graphic */}
        <div className="w-48 sm:w-64 h-28 sm:h-32 rounded-xl overflow-hidden shadow-xs border border-white/60 shrink-0 relative bg-[#EFF6FF]">
          <svg viewBox="0 0 240 120" className="w-full h-full object-cover">
            <rect width="240" height="120" fill="#E2EBF5" />
            <path d="M0,90 Q60,75 120,85 T240,80 L240,120 L0,120 Z" fill="#7BA168" />
            <rect x="40" y="45" width="160" height="55" rx="3" fill="#F8FAFC" />
            <rect x="55" y="55" width="45" height="35" rx="2" fill="#3B82F6" opacity="0.3" />
            <rect x="110" y="55" width="50" height="45" rx="2" fill="#E2E8F0" />
            <rect x="120" y="65" width="30" height="35" rx="1" fill="#1E293B" />
            <rect x="170" y="50" width="20" height="40" rx="1" fill="#3B82F6" opacity="0.35" />
            <rect x="35" y="40" width="170" height="8" rx="2" fill="#334155" />
            <circle cx="25" cy="70" r="14" fill="#5A8842" />
            <circle cx="215" cy="65" r="16" fill="#4D7A36" />
          </svg>
        </div>
      </div>

      {/* 2. MAIN REQUIREMENTS INPUT CARD (Matches Screen 1 in reference image) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
        {/* Top Tabs inside card: "Type your requirements" vs "Use Voice Input" */}
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
          <button
            type="button"
            onClick={() => setInputTab('text')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              inputTab === 'text'
                ? 'bg-[#EBF3FC] text-[#2B66F6] shadow-xs'
                : 'text-[#64748B] hover:text-[#0C1E38]'
            }`}
          >
            <span>Type your requirements</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputTab('voice');
              setShowVoiceModal(true);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              inputTab === 'voice'
                ? 'bg-[#EBF3FC] text-[#2B66F6] shadow-xs'
                : 'text-[#64748B] hover:text-[#0C1E38]'
            }`}
          >
            <Mic className="w-4 h-4 text-[#2B66F6]" />
            <span>Use Voice Input</span>
          </button>
        </div>

        {/* Text Input with Microphone and Language control */}
        <div className="relative">
          <textarea
            value={naturalPrompt}
            onChange={(e) => setNaturalPrompt(e.target.value)}
            rows={4}
            placeholder="Example: Create a 1200 sq ft east-facing house with three bedrooms, two bathrooms, open kitchen, living room, dining area and car parking."
            className="w-full p-4 pr-36 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0C1E38] focus:border-[#2B66F6] focus:ring-2 focus:ring-[#2B66F6]/20 transition resize-none outline-none leading-relaxed placeholder:text-[#94A3B8]"
          />

          {/* Microphone & Language Bar inside textarea right side */}
          <div className="absolute right-3 bottom-3 flex items-center gap-3">
            {/* Language Selector (English / Tamil) */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'ta')}
                className="appearance-none bg-slate-50 border border-[#E2E8F0] hover:border-slate-300 text-xs font-semibold text-[#475569] py-1.5 pl-2.5 pr-6 rounded-lg cursor-pointer outline-none"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Circular Blue Microphone Button with Listening Animation */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-[#2B66F6] text-white hover:bg-[#1E52D8]'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Click to speak your requirements'}
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
            </button>
          </div>
        </div>

        {/* Speech notice if active or error */}
        {isRecording && (
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#2B66F6] flex items-center gap-2 animate-fade-in">
            <Volume2 className="w-4 h-4 animate-spin" />
            <span>Listening to your voice ({language === 'ta' ? 'Tamil' : 'English'}). Speak your room requirements clearly...</span>
          </div>
        )}

        {speechError && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Action Buttons: Generate Plan & Clear */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !naturalPrompt.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2B66F6] hover:bg-[#1E52D8] disabled:opacity-50 transition cursor-pointer flex items-center gap-2 shadow-xs active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Generating Layout...' : 'Generate Plan'}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl font-medium text-xs text-[#64748B] hover:text-[#0C1E38] border border-[#E2E8F0] hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 3. QUICK EXAMPLES SECTION (Matches Screen 1 in reference image) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#0C1E38] uppercase tracking-wider">
          Quick Examples
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickExamples.map((ex, i) => {
            const isSelected = naturalPrompt === ex.prompt;
            return (
              <div
                key={i}
                onClick={() => handleSelectExample(ex)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-1 ${
                  isSelected
                    ? 'bg-blue-50/40 border-[#2B66F6] ring-1 ring-[#2B66F6]'
                    : 'bg-white border-[#E2E8F0] hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0C1E38]">{ex.title}</span>
                  <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2B66F6]' : 'text-[#CBD5E1]'}`} />
                </div>
                <span className="text-[11px] text-[#64748B]">{ex.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ADDITIONAL DETAILS (OPTIONAL) SECTION (Matches Screen 1 in reference image) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-[#0C1E38] uppercase tracking-wider">
          Additional Details (Optional)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Building Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#64748B]">Building Type</label>
            <div className="relative">
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer focus:border-[#2B66F6]"
              >
                <option value="House">House</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Duplex">Duplex</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Plot Dimensions */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#64748B]">Plot Dimensions</label>
            <div className="relative">
              <select
                value={plotDimensions}
                onChange={(e) => handlePlotDimensionsChange(e.target.value)}
                className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer focus:border-[#2B66F6]"
              >
                <option value="20 x 30 ft">20 x 30 ft (600 sq.ft)</option>
                <option value="25 x 35 ft">25 x 35 ft (875 sq.ft)</option>
                <option value="30 x 40 ft">30 x 40 ft (1200 sq.ft)</option>
                <option value="40 x 50 ft">40 x 50 ft (2000 sq.ft)</option>
                <option value="40 x 60 ft">40 x 60 ft (2400 sq.ft)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Floors */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#64748B]">Floors</label>
            <div className="relative">
              <select
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value))}
                className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer focus:border-[#2B66F6]"
              >
                <option value={1}>1 Floor</option>
                <option value={2}>2 Floors</option>
                <option value={3}>3 Floors</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Budget Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#64748B]">Budget Range</label>
            <div className="relative">
              <select
                value={budgetRange}
                onChange={(e) => handleBudgetRangeChange(e.target.value)}
                className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0C1E38] outline-none cursor-pointer focus:border-[#2B66F6]"
              >
                <option value="₹ 10 - 15 Lakhs">₹ 10 - 15 Lakhs</option>
                <option value="₹ 15 - 25 Lakhs">₹ 15 - 25 Lakhs</option>
                <option value="₹ 25 - 40 Lakhs">₹ 25 - 40 Lakhs</option>
                <option value="₹ 40+ Lakhs">₹ 40+ Lakhs</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recognition Modal */}
      {showVoiceModal && (
        <VoiceToBlueprint
          onApplyRequirements={handleApplyVoiceParsed}
          onClose={() => setShowVoiceModal(false)}
        />
      )}
    </div>
  );
};
