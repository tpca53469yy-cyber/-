
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
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  
  // --- Live Mode & Audio Handling ---
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveAdvice, setLiveAdvice] = useState('我正在聽，請保持深呼吸...');
  
  const currentPlaceholder = SCENARIOS.find(s => s.type === selectedScenario)?.placeholder || '請輸入內容...';
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('parenting_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      const hasAccepted = localStorage.getItem('disclaimer_accepted');
      if (!hasAccepted) setShowDisclaimer(true);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } catch (e) {
      setBootError("啟動時發生錯誤，請重新整理頁面。");
    }
  }, []);

  const saveToHistory = (newResult: TranslationResult) => {
    const updated = [newResult, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('parenting_history', JSON.stringify(updated));
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: [30, 50, 30], heavy: [100, 50, 100] };
      navigator.vibrate(patterns[type]);
    }
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
      saveToHistory(data);
      triggerHaptic('medium');
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError("尚未設定 API Key。請在 Vercel Settings > Environment Variables 中新增 API_KEY。");
      } else if (err.message === "API_KEY_INVALID") {
        setError("API Key 無效或已過期。請確認您使用的是付費計畫或正確的 Key。");
      } else {
        setError("連線失敗：請檢查網路或 API Key 設定。");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario, loading, history]);

  const toggleLiveMode = useCallback(async () => {
    if (!isOnline) {
      setError('連線已中斷，無法啟動陪伴模式');
      return;
    }
    triggerHaptic('medium');
    if (isLiveMode) {
      setIsLiveMode(false);
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsLiveMode(true);
        setLiveAdvice('已連線。我會自動捕捉衝突瞬間，為您提供即時支援...');
      } catch (err) {
        setError('無法取得麥克風權限');
      }
    }
  }, [isLiveMode, isOnline]);

  const toggleListening = useCallback(() => {
    triggerHaptic('light');
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setResult(null);
      setStreamingText('');
      try {
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
          setError('您的瀏覽器不支援語音辨識');
        }
      } catch (err) {
        setError('麥克風啟動失敗');
      }
    }
  }, [isListening]);

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-10">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-4xl"></i>
          <p className="font-bold text-slate-800">{bootError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 select-none overflow-x-hidden font-sans">
      {!isOnline && (
        <div className="bg-red-500 text-white text-[10px] py-2 text-center font-bold sticky top-0 z-50">
          <i className="fa-solid fa-cloud-slash mr-1"></i> 離線模式：翻譯功能暫時受限
        </div>
      )}

      {showDisclaimer && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-8">
          <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mx-auto">
              <i className="fa-solid fa-shield-heart text-2xl"></i>
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-black text-xl text-slate-800">準備好給孩子溫暖了嗎？</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                這是您的專屬溝通工具。**實測建議**：在手機瀏覽器點選「加入主畫面」以獲得全螢幕 App 體驗。
              </p>
            </div>
            <button 
              onClick={() => { localStorage.setItem('disclaimer_accepted', 'true'); setShowDisclaimer(false); triggerHaptic('heavy'); }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              開始溫暖對話
            </button>
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg shadow-orange-200 flex items-center justify-center">
              <i className="fa-solid fa-heart text-white text-xs"></i>
            </div>
            <span className="font-black tracking-tighter text-slate-800">溫暖譯站</span>
          </div>
          <button onClick={toggleLiveMode} className={`flex items-center space-x-2 px-4 py-2 rounded-full text-[10px] font-black transition-all active:scale-90 ${isLiveMode ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
            <span>{isLiveMode ? '陪伴中' : '啟動陪伴'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-8 space-y-8">
        {isLiveMode && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-slate-900 rounded-[3rem] p-8 shadow-2xl overflow-hidden min-h-[300px] flex flex-col justify-between border border-white/10">
              <div className="flex justify-between items-center mb-8">
                <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400 text-[9px] font-black tracking-widest uppercase">Real-time Support</div>
                <div className="flex items-end space-x-1 h-6">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-1 bg-orange-500 rounded-full transition-all duration-150" style={{ height: `${Math.random() * (audioLevel / (i+1) + 10)}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-white text-2xl font-bold leading-tight">{liveAdvice}</h2>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] text-slate-400 font-bold inline-block"><i className="fa-solid fa-shield-halved mr-2 text-blue-400"></i> 抗噪模式已啟動</div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 font-medium">手機放在身邊即可生效</p>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </div>
            </div>
          </div>
        )}

        {!isLiveMode && (streamingText || result) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white border-2 border-orange-400 rounded-[3rem] p-8 shadow-2xl shadow-orange-100/50 relative">
              <div className="absolute -top-3 left-8 bg-orange-500 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg">
                <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> SUGGESTED RESPONSE
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-[1.3] mt-2 whitespace-pre-wrap">「{streamingText}」</p>
              {result && (
                <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">心理需求洞察</div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{result.psychologicalContext}</p>
                  </div>
                  <div className="bg-orange-50 p-5 rounded-[2rem] border border-orange-100">
                    <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">建議當下行動</div>
                    <p className="text-xs text-orange-800/80 leading-relaxed font-bold">{result.suggestedAction}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isLiveMode && (
          <div className={`bg-white rounded-[3rem] shadow-sm border transition-all duration-500 overflow-hidden ${isListening ? 'border-red-400 ring-[6px] ring-red-50' : 'border-slate-200'}`}>
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex space-x-3 overflow-x-auto no-scrollbar scroll-smooth">
              {SCENARIOS.map((s) => (
                <button key={s.type} onClick={() => { setSelectedScenario(s.type); triggerHaptic('light'); }} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all active:scale-90 ${selectedScenario === s.type ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  <i className={`fa-solid ${s.icon} mr-2`}></i> {s.type}
                </button>
              ))}
            </div>
            <div className="p-8">
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={isListening ? '我正在傾聽您的感受...' : currentPlaceholder} className={`w-full transition-all duration-300 text-xl font-medium border-0 bg-transparent focus:ring-0 outline-none resize-none placeholder:text-slate-200 ${result ? 'h-24' : 'h-40'}`} />
              {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-[11px] font-bold mb-4 flex items-center"><i className="fa-solid fa-circle-exclamation mr-2"></i>{error}</div>}
              <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                <button onClick={() => { setInputText(''); triggerHaptic('light'); }} className="text-slate-300 text-[11px] font-black px-2 active:text-slate-500">清除內容</button>
                <div className="flex space-x-4">
                  <button onClick={toggleListening} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-200' : 'bg-slate-100 text-slate-600'}`}>
                    <i className={`fa-solid ${isListening ? 'fa-stop text-lg' : 'fa-microphone text-xl'}`}></i>
                  </button>
                  <button onClick={handleTranslate} disabled={loading || !inputText.trim()} className="px-8 bg-orange-500 text-white rounded-full font-black text-sm shadow-xl shadow-orange-200 disabled:bg-slate-100 disabled:text-slate-300 transition-all active:scale-95">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : '翻譯成溫暖'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && !isLiveMode && (
          <section className="space-y-4">
            <div className="flex justify-between items-end px-2">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最近的溫暖紀錄</h3>
               <button onClick={() => { setHistory([]); localStorage.removeItem('parenting_history'); triggerHaptic('light'); }} className="text-[10px] text-slate-300 font-bold hover:text-red-400">清空全部</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {history.map((h, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col space-y-2 animate-in slide-in-from-left-4 duration-300">
                  <p className="text-[9px] text-slate-400 font-bold line-clamp-1">您原本說：{h.originalText}</p>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">「{h.translatedText}」</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100">
          <div className="flex items-start space-x-4">
            <div className="text-orange-500 mt-1"><i className="fa-solid fa-mobile-screen-button text-2xl"></i></div>
            <div className="space-y-2">
              <h4 className="font-black text-orange-900 text-sm">如何獲得完整體驗？</h4>
              <p className="text-[11px] text-orange-800/70 leading-relaxed">
                1. 使用 Vercel 佈署後開啟網址。<br/>
                2. 點選瀏覽器選單中的「加入主畫面」。<br/>
                3. 從桌面開啟後，您將擁有無網址列、支援震動回饋的完整 App 實測感。
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4">Core Theories</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">我們整合了全球公認的三大教養體系，將冰冷的心理學轉化為您口袋裡的溫柔力量。</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {METHODOLOGIES.map((m, i) => (
                <div key={i} className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <div className="text-[11px] font-black text-orange-200 mb-2">{m.name}</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 py-12 text-center px-10 border-t border-slate-100 mb-[env(safe-area-inset-bottom)]">
        <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mb-6">Parenting Warm Station</div>
        <p className="text-[11px] text-slate-400 leading-loose max-w-xs mx-auto">「沒有任何一種翻譯，比您的愛更有力量。」<br/>這是一個專為您與孩子設計的避風港。</p>
      </footer>
    </div>
  );
};

export default App;
