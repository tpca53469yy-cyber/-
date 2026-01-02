
import React, { useState, useCallback, useRef } from 'react';
import { TranslationResult, Scenario } from './types';
import { SCENARIOS } from './constants';
import { translateToPositiveParentingStream } from './services/geminiService';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.GENERAL);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

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
      console.error("App Caught Error:", err);
      // 僅顯示 API 原始錯誤訊息
      setError(err.message || "連線至服務時發生錯誤。");
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("您的瀏覽器不支援語音功能");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.onresult = (event: any) => {
        setInputText(event.results[0][0].transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fefaf6] text-slate-800 pb-10 font-sans">
      <nav className="p-6 flex justify-center items-center border-b border-orange-100 bg-white/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-heart text-orange-500"></i>
          <h1 className="font-bold text-lg">親子溫暖譯站</h1>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pt-8 space-y-6">
        {/* 場景選取 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              onClick={() => setSelectedScenario(s.type)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedScenario === s.type ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'
              }`}
            >
              {s.type}
            </button>
          ))}
        </div>

        {/* 輸入區域 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 space-y-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={SCENARIOS.find(s => s.type === selectedScenario)?.placeholder}
            className="w-full h-32 border-0 focus:ring-0 text-lg resize-none placeholder:text-slate-200"
          />
          <div className="flex justify-between items-center">
            <button 
              onClick={toggleListening} 
              className={`p-4 rounded-2xl transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-50 text-orange-500'}`}
              title="語音輸入"
            >
              <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : '翻譯成正向語言'}
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0"></i>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* 結果顯示 */}
        {(streamingText || result) && (
          <div className="bg-white rounded-3xl p-8 border-2 border-orange-100 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">建議說法</span>
              <p className="text-2xl font-bold leading-snug">{streamingText}</p>
            </div>
            
            {result && (
              <div className="pt-6 border-t border-orange-50 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-tighter">孩子的心聲</h4>
                  <p className="text-slate-600 leading-relaxed">{result.psychologicalContext}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-tighter">行動建議</h4>
                  <p className="text-orange-600 font-medium leading-relaxed">{result.suggestedAction}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
