
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'zh-TW';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('語音辨識錯誤:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("您的瀏覽器不支援語音辨識功能。");
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
      setError(err.message || '連線至 AI 服務時發生錯誤，請確認環境變數 API_KEY 是否已正確設定。');
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario]);

  return (
    <div className="min-h-screen bg-[#fdfaf7] text-slate-900 pb-12 font-sans">
      <nav className="bg-white/80 backdrop-blur border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-heart text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-bold text-slate-800">親子溫暖譯站</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 mt-8 space-y-8">
        {/* 情境選擇 */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">選擇溝通情境</label>
          <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.type}
                onClick={() => setSelectedScenario(s.type)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
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
        </div>

        {/* 輸入卡片 */}
        <div className={`bg-white rounded-[2rem] p-6 shadow-sm border-2 transition-all duration-300 ${isListening ? 'border-orange-400 ring-4 ring-orange-50' : 'border-white'}`}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={SCENARIOS.find(s => s.type === selectedScenario)?.placeholder || '請輸入原話...'}
            className="w-full h-32 border-0 focus:ring-0 text-lg md:text-xl resize-none placeholder:text-slate-200 bg-transparent leading-relaxed"
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
            <button 
              onClick={toggleListening}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}
              title="語音輸入"
            >
              <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="bg-orange-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 disabled:opacity-30 transition-all flex items-center space-x-2"
            >
              {loading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              )}
              <span>轉換為溫暖語言</span>
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center space-x-2 animate-fade-in">
            <i className="fa-solid fa-circle-exclamation"></i>
            <p>{error}</p>
          </div>
        )}

        {/* 翻譯結果 */}
        {(streamingText || result) && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border-2 border-orange-100 rounded-[2rem] p-8 shadow-xl shadow-orange-50/50">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-3 py-1 bg-orange-50 rounded-full">
                  建議說法
                </span>
                {result && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium">
                    {result.frameworkReference}
                  </span>
                )}
              </div>
              
              <p className="text-2xl md:text-3xl font-bold leading-tight text-slate-800">
                {streamingText}
                {!result && <span className="inline-block w-1 h-8 bg-orange-400 ml-1 animate-pulse align-middle"></span>}
              </p>

              {result && (
                <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <i className="fa-solid fa-brain mr-2 text-orange-300"></i>
                      孩子的心聲
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50 p-4 rounded-2xl">
                      「{result.psychologicalContext}」
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center tracking-widest">
                      <i className="fa-solid fa-lightbulb mr-2 text-orange-300"></i>
                      行動建議
                    </h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {result.suggestedAction}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部導引 */}
        {!result && !loading && (
          <div className="text-center space-y-4 pt-8">
            <p className="text-slate-300 text-sm">常用的教養理論基礎</p>
            <div className="flex justify-center gap-4">
              {METHODOLOGIES.map(m => (
                <div key={m.name} className="px-3 py-1 bg-white rounded-full text-[10px] text-slate-400 border border-slate-100">
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 text-center text-[11px] text-slate-300 uppercase tracking-widest">
        親子溫暖譯站 · 平和溝通 · 建立連結
      </footer>
    </div>
  );
};

export default App;
