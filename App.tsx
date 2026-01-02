
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
      setError(err.message || "連線異常，請重新嘗試。");
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
    <div className="min-h-screen bg-[#fcfcfd] text-slate-800 pb-20 font-sans">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-2 rounded-full text-xs font-bold z-[60] shadow-2xl">
          網址已複製到剪貼簿！
        </div>
      )}

      {/* 導覽列 */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
            <i className="fa-solid fa-heart text-white text-xs"></i>
          </div>
          <span className="font-black text-lg tracking-tight">溫暖譯站</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={copyUrl} className="text-slate-400 hover:text-orange-500 transition-colors">
            <i className="fa-solid fa-share-nodes"></i>
          </button>
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{isOnline ? 'Active' : 'Offline'}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-8">
        {/* 情境切換區 */}
        <div className="bg-white rounded-[2.5rem] p-2 shadow-sm border border-slate-50 flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
          {SCENARIOS.map((s) => (
            <button
              key={s.type}
              onClick={() => { triggerHaptic('light'); setSelectedScenario(s.type); }}
              className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[11px] font-black transition-all ${
                selectedScenario === s.type 
                  ? 'bg-slate-900 text-white shadow-xl' 
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <i className={`fa-solid ${s.icon} mr-2`}></i> {s.type}
            </button>
          ))}
        </div>

        {/* 輸入與主按鈕 */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-50 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? '請說，我正在聽...' : currentPlaceholder}
            className="w-full h-40 bg-transparent border-0 focus:ring-0 text-xl font-medium placeholder:text-slate-200 resize-none mb-8"
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold flex items-center">
              <i className="fa-solid fa-circle-exclamation mr-3 text-sm"></i> {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => { setInputText(''); triggerHaptic('light'); }} className="text-slate-300 text-[11px] font-black tracking-widest hover:text-slate-400 active:scale-90 transition-all">
              清除內容
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleListening}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isListening ? 'bg-red-500 text-white animate-pulse shadow-red-100' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <i className={`fa-solid ${isListening ? 'fa-stop text-xl' : 'fa-microphone text-xl'}`}></i>
              </button>
              <button
                onClick={handleTranslate}
                disabled={loading || !inputText.trim()}
                className="px-10 h-14 bg-orange-500 text-white rounded-full font-black text-sm shadow-xl shadow-orange-200 disabled:opacity-20 active:scale-95 transition-all"
              >
                {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : null}
                {loading ? '轉化中' : '換句話說'}
              </button>
            </div>
          </div>
        </div>

        {/* 翻譯結果展示 */}
        {(streamingText || result) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white border-2 border-orange-100 rounded-[3rem] p-8 sm:p-10 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
               <div className="relative z-10 space-y-6">
                 <div className="flex items-center space-x-2">
                   <span className="bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                     Warm Response
                   </span>
                 </div>
                 <p className="text-2xl sm:text-3xl font-bold text-slate-800 leading-[1.4] whitespace-pre-wrap">
                   「{streamingText}」
                   {loading && !result && <span className="inline-block w-1.5 h-7 ml-1 bg-orange-300 animate-pulse"></span>}
                 </p>

                 {result && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                     <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">心理內在冰山</h4>
                       <p className="text-sm text-slate-500 leading-relaxed">{result.psychologicalContext}</p>
                     </div>
                     <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">當下具體行動</h4>
                       <p className="text-sm text-slate-500 leading-relaxed font-bold">{result.suggestedAction}</p>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* 歷史紀錄與腳註 */}
        <section className="bg-orange-50 p-8 rounded-[3rem] border border-orange-100 flex items-start space-x-6">
           <div className="text-orange-500 mt-1"><i className="fa-solid fa-mobile-screen text-2xl"></i></div>
           <div className="space-y-2">
             <h4 className="font-black text-sm text-orange-900">手機專屬溫暖建議</h4>
             <p className="text-[11px] text-orange-800/60 leading-relaxed">
               在手機瀏覽器點選「加入主畫面」，將此站存為 App。<br/>
               當情緒湧上時，隨時拿出手機，讓溫柔的力量伴您左右。
             </p>
           </div>
        </section>

        <footer className="text-center space-y-4 pt-8">
           <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">Healing Through Dialogue</p>
           <div className="flex justify-center space-x-4">
             {METHODOLOGIES.map(m => (
               <span key={m.name} className="text-[9px] text-slate-300 border border-slate-100 px-3 py-1 rounded-full">{m.name}</span>
             ))}
           </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
