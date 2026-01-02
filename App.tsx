
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TranslationResult, Scenario } from './types.ts';
import { SCENARIOS, METHODOLOGIES } from './constants.ts';
import { translateToPositiveParentingStream } from './services/geminiService.ts';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.GENERAL);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // 初始化語音辨識
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'zh-TW';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("您的瀏覽器不支援語音辨識");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setStreamingText('');
    setResult(null);

    try {
      const data = await translateToPositiveParentingStream(
        inputText, 
        selectedScenario, 
        (partial) => setStreamingText(partial)
      );
      setResult(data);
      setStreamingText(data.translatedText);
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || '翻譯過程中發生錯誤，請確認 API Key 是否正確。');
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario]);

  const currentPlaceholder = SCENARIOS.find(s => s.type === selectedScenario)?.placeholder || '請輸入您想對孩子說的話...';

  return (
    <div className="min-h-screen bg-[#fdfaf7] text-slate-900 pb-12 font-sans">
      <header className="bg-white/80 backdrop-blur border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-heart text-orange-500 text-xl"></i>
            <h1 className="text-lg font-bold tracking-tight">親子溫暖譯站</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 mt-8 space-y-6">
        {/* 場景選取器 */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              onClick={() => setSelectedScenario(s.type)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                selectedScenario === s.type 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-orange-200'
              }`}
            >
              <i className={`fa-solid ${s.icon} mr-1.5`}></i>
              {s.type}
            </button>
          ))}
        </div>

        {/* 輸入區域 */}
        <div className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${isListening ? 'border-orange-400 ring-4 ring-orange-50' : 'border-white'}`}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={currentPlaceholder}
            className="w-full h-32 border-0 focus:ring-0 text-lg resize-none placeholder:text-slate-200 bg-transparent"
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
            <button 
              onClick={toggleListening}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
            >
              <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:opacity-30 transition-all flex items-center space-x-2"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
              <span>立即轉換</span>
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center space-x-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <p>{error}</p>
          </div>
        )}

        {/* 結果區域 */}
        {(streamingText || result) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border-2 border-orange-100 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">建議說法</span>
                {result && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                    {result.frameworkReference}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold leading-snug text-slate-800">
                {streamingText}
                {!result && <span className="inline-block w-1.5 h-6 bg-orange-400 ml-1 animate-pulse"></span>}
              </p>

              {result && (
                <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center">
                      <i className="fa-solid fa-brain mr-2 text-orange-300"></i>
                      孩子的心聲
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      {result.psychologicalContext}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center">
                      <i className="fa-solid fa-lightbulb mr-2 text-orange-300"></i>
                      行動建議
                    </h4>
                    <p className="text-sm text-slate-700 font-medium">
                      {result.suggestedAction}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 教養理論區 */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white/90">
          <h3 className="text-xs font-bold text-orange-400 mb-4 tracking-widest flex items-center">
            <i className="fa-solid fa-shield-heart mr-2"></i>
            正向教養理論基礎
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {METHODOLOGIES.map((m, i) => (
              <div key={i} className="space-y-1">
                <h4 className="text-[11px] font-bold text-white">{m.name}</h4>
                <p className="text-[10px] text-white/40 leading-relaxed">{m.desc.slice(0, 35)}...</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-[10px] text-slate-300">
        © 2024 親子溫暖譯站 | 讓溝通更有溫度
      </footer>
    </div>
  );
};

export default App;
