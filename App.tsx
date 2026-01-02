
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TranslationResult, Scenario } from './types';
import { SCENARIOS, METHODOLOGIES } from './constants';
import { translateToPositiveParentingStream } from './services/geminiService';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.GENERAL);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const currentPlaceholder = SCENARIOS.find(s => s.type === selectedScenario)?.placeholder || '請輸入內容...';

  useEffect(() => {
    const savedHistory = localStorage.getItem('parenting_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'light' ? 10 : 30);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowToast(true);
    triggerHaptic('light');
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim() || loading) return;
    
    triggerHaptic('light');
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
      
      const updatedHistory = [data, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem('parenting_history', JSON.stringify(updatedHistory));
      
      triggerHaptic('medium');
    } catch (err: any) {
      // 顯示更詳細的錯誤，以便除錯
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario, loading, history]);

  const toggleListening = useCallback(() => {
    triggerHaptic('light');
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        if (!recognitionRef.current) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.onresult = (e: any) => {
            let t = '';
            for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
            setInputText(prev => prev + t);
          };
          recognitionRef.current.onend = () => setIsListening(false);
        }
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        setError('瀏覽器不支援語音辨識');
      }
    }
  }, [isListening]);

  return (
    <div className="min-h-screen bg-[#fefaf6] text-slate-800 pb-20 font-sans">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white px-6 py-2 rounded-full text-xs font-bold z-[60] shadow-2xl">
          網址已複製！
        </div>
      )}

      {/* Header */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
            <i className="fa-solid fa-heart text-white text-sm"></i>
          </div>
          <span className="font-black text-xl tracking-tight bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">溫暖譯站</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={copyUrl} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors">
            <i className="fa-solid fa-share-nodes"></i>
          </button>
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isOnline ? 'Active' : 'Offline'}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        {/* Scenarios */}
        <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-2 shadow-inner border border-white flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              onClick={() => { triggerHaptic('light'); setSelectedScenario(s.type); }}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black transition-all duration-300 ${
                selectedScenario === s.type 
                  ? 'bg-slate-900 text-white shadow-xl scale-105' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-600'
              }`}
            >
              <i className={`fa-solid ${s.icon} mr-2 ${selectedScenario === s.type ? 'text-orange-400' : ''}`}></i> {s.type}
            </button>
          ))}
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(251,146,60,0.12)] p-8 sm:p-12 border border-orange-50 relative overflow-hidden">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? '請說，我正在聽...' : currentPlaceholder}
            className="w-full h-44 bg-transparent border-0 focus:ring-0 text-2xl font-medium placeholder:text-slate-200 resize-none mb-6 leading-relaxed"
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-3xl text-[13px] font-bold flex items-center border border-red-100">
              <i className="fa-solid fa-circle-exclamation mr-3 text-sm shrink-0"></i> 
              <span className="break-all">{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <button 
              onClick={() => { setInputText(''); triggerHaptic('light'); }} 
              className="text-slate-300 text-[11px] font-black tracking-[0.2em] hover:text-orange-400 transition-all uppercase"
            >
              <i className="fa-solid fa-trash-can mr-2"></i> 清除
            </button>
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <button
                onClick={toggleListening}
                className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-red-200 scale-110' 
                    : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-400'
                }`}
              >
                <i className={`fa-solid ${isListening ? 'fa-stop text-xl' : 'fa-microphone text-xl'}`}></i>
              </button>
              <button
                onClick={handleTranslate}
                disabled={loading || !inputText.trim()}
                className="flex-1 sm:flex-none px-12 h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-3xl font-black text-base shadow-2xl shadow-orange-200 disabled:opacity-20 active:scale-95 transition-all hover:shadow-orange-300 flex items-center justify-center"
              >
                {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>}
                {loading ? '轉化中' : '換句話說'}
              </button>
            </div>
          </div>
        </div>

        {/* Result Card */}
        {(streamingText || result) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white border-2 border-orange-100 rounded-[3.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
               <div className="relative z-10 space-y-8">
                 <div className="flex items-center space-x-3">
                   <div className="h-0.5 w-8 bg-orange-500"></div>
                   <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">溫柔的轉換</span>
                 </div>
                 
                 <p className="text-3xl sm:text-4xl font-bold text-slate-800 leading-[1.4] whitespace-pre-wrap tracking-tight">
                   {streamingText}
                   {loading && !result && <span className="inline-block w-2 h-10 ml-2 bg-orange-300 animate-pulse align-middle"></span>}
                 </p>

                 {result && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-orange-50">
                     <div className="space-y-4">
                       <h4 className="flex items-center text-[11px] font-black text-orange-400 uppercase tracking-[0.2em]">心理內在冰山</h4>
                       <p className="text-base text-slate-500 leading-relaxed font-medium">{result.psychologicalContext}</p>
                     </div>
                     <div className="space-y-4">
                       <h4 className="flex items-center text-[11px] font-black text-orange-400 uppercase tracking-[0.2em]">當下具體行動</h4>
                       <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
                         <p className="text-base text-orange-800 leading-relaxed font-bold">{result.suggestedAction}</p>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        <footer className="text-center space-y-6 pt-12 pb-6">
           <div className="flex justify-center items-center space-x-4 text-slate-300">
             <div className="h-px w-8 bg-slate-200"></div>
             <p className="text-[10px] font-bold uppercase tracking-[0.5em]">Healing Dialogue</p>
             <div className="h-px w-8 bg-slate-200"></div>
           </div>
           <p className="text-[10px] text-slate-300">© 溫暖譯站 · 專為愛與理解而生</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
