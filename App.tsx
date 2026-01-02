
import React, { useState, useCallback, useRef } from 'react';
import { TranslationResult, Scenario } from './types';
import { SCENARIOS } from './constants';
import { translateToPositiveParenting } from './services/geminiService';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.GENERAL);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await translateToPositiveParenting(inputText, selectedScenario);
      setResult(data);
    } catch (err) {
      setError("翻譯過程發生錯誤，請稍後再試。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'zh-TW';
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
        };
        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("您的瀏覽器不支援語音辨識");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fefaf6] text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-block p-3 bg-orange-100 rounded-full mb-2">
            <i className="fa-solid fa-heart text-orange-500 text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">親子溫暖譯站</h1>
          <p className="text-slate-500 text-sm">將情緒轉化為愛的連結</p>
        </header>

        {/* Scenario Picker */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              onClick={() => setSelectedScenario(s.type)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                selectedScenario === s.type 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'bg-white text-slate-400 hover:bg-orange-50 border border-slate-100'
              }`}
            >
              <i className={`fa-solid ${s.icon} mr-1`}></i> {s.type}
            </button>
          ))}
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4 border border-orange-50">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={SCENARIOS.find(s => s.type === selectedScenario)?.placeholder}
              className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-500/20 resize-none text-slate-700 placeholder-slate-300 transition-all"
            />
            <button
              onClick={toggleListening}
              className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
              }`}
            >
              <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
          </div>
          
          <button
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:bg-orange-600 disabled:bg-slate-200 disabled:shadow-none transition-all"
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : '翻譯為溫柔話語'}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
              <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-3">溫和且堅定的建議</h3>
              <p className="text-xl font-medium leading-relaxed text-slate-800">
                {result.translatedText}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
                <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">背後原則</h4>
                <ul className="space-y-2">
                  {result.principles.map((p, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start">
                      <i className="fa-solid fa-circle-check text-green-500 mr-2 mt-0.5 text-[12px]"></i>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
                <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">心理狀態分析</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{result.psychologicalContext}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
              <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">實體行動建議</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{result.suggestedAction}</p>
            </div>
            
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-400 text-[10px] rounded-full">
                依據理論：{result.frameworkReference}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Added default export to fix "Module has no default export" error in index.tsx
export default App;
