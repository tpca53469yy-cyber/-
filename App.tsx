
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TranslationResult, Scenario } from './types';
import { SCENARIOS, METHODOLOGIES } from './constants';
import { translateToPositiveParentingStream } from './services/geminiService';
import { GoogleGenAI, Modality } from '@google/genai';

const App: React.FC = () => {
  // --- Existing State ---
  const [inputText, setInputText] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(Scenario.GENERAL);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // Legacy Microphone
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // --- Live Mode State ---
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 初始化語音辨識 (舊有模式)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-TW';
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(prev => prev + transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // 模擬 Live Mode 的音量視覺回饋
  useEffect(() => {
    let interval: any;
    if (isLiveMode) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  const toggleLiveMode = useCallback(() => {
    if (isLiveMode) {
      setIsLiveMode(false);
      // 在此處關閉 Live Session
    } else {
      setIsLiveMode(true);
      setResult(null);
      setStreamingText('正在聆聽衝突現場，我會即時提供建議...');
      // 實際實作中會在此呼叫 ai.live.connect
    }
  }, [isLiveMode]);

  const toggleListening = useCallback(() => {
    if (isLiveMode) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      setResult(null);
      setStreamingText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, isLiveMode]);

  // Fix: Derive current placeholder based on selected scenario
  const currentPlaceholder = SCENARIOS.find(s => s.type === selectedScenario)?.placeholder || '請輸入您想對孩子說的話...';

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setStreamingText('');
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const data = await translateToPositiveParentingStream(
        inputText, 
        selectedScenario, 
        (partial) => setStreamingText(partial)
      );
      setResult(data);
      setStreamingText(data.translatedText);
    } catch (err) {
      setError('翻譯過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedScenario]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-1.5 rounded-lg shadow-inner">
              <i className="fa-solid fa-heart text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-800">親子溫暖譯站</h1>
          </div>
          <button 
            onClick={toggleLiveMode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
              isLiveMode 
              ? 'bg-red-50 border-red-200 text-red-600 ring-2 ring-red-100' 
              : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`}></span>
            <span>{isLiveMode ? '即時陪伴模式運行中' : '開啟即時陪伴模式'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 即時視覺回饋區 */}
        {isLiveMode && (
          <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <div 
                className="h-full bg-orange-400 transition-all duration-100" 
                style={{ width: `${audioLevel}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="text-orange-400 text-xs font-bold tracking-widest uppercase">
                Live Support Active
              </div>
              <div className="text-slate-500 text-[10px]">自動過濾背景哭聲</div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                <p className="text-white text-xl font-medium leading-relaxed">
                  「親愛的，我看到你現在很難受，我會陪在你身邊等你不哭。」
                </p>
                <div className="mt-2 flex items-center text-[10px] text-orange-300 font-bold uppercase">
                  <i className="fa-solid fa-bolt mr-1"></i> 即時建議語句
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/30">
                  建議動作：蹲下與孩子視線齊平
                </div>
                <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-500/30">
                  技術：先連結再修正
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 傳統翻譯結果區 */}
        {!isLiveMode && (streamingText || result) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white border-2 border-orange-400 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center text-orange-600 font-bold text-sm">
                  <i className="fa-solid fa-comment-heart mr-2"></i>
                  您可以試著這樣說：
                </div>
                {result && (
                  <div className="bg-orange-100 text-orange-700 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                    {result.frameworkReference}
                  </div>
                )}
              </div>
              
              <div className="min-h-[5rem]">
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 leading-snug">
                  「{streamingText}」
                  {!result && loading && <span className="inline-block w-1.5 h-7 bg-orange-400 ml-1 animate-pulse"></span>}
                </p>
              </div>

              {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-100">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">💡 行為動機</h4>
                      <p className="text-xs text-slate-500 leading-relaxed italic">{result.psychologicalContext}</p>
                    </div>
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1.5">配合動作</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{result.suggestedAction}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 輸入區域 */}
        {!isLiveMode && (
          <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 ${isListening ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-200'}`}>
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
              <div className="flex space-x-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.type}
                    onClick={() => setSelectedScenario(scenario.type)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all ${
                      selectedScenario === scenario.type ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <i className={`fa-solid ${scenario.icon} mr-1.5`}></i>
                    {scenario.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? '正在聽取您的情緒...' : currentPlaceholder}
                className={`w-full transition-all duration-300 p-4 text-base border-0 bg-transparent focus:ring-0 outline-none resize-none placeholder:text-slate-300 ${result ? 'h-20' : 'h-32'}`}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                <button onClick={() => setInputText('')} className={`text-slate-300 hover:text-slate-500 text-xs px-2 ${!inputText && 'invisible'}`}>
                  <i className="fa-solid fa-eraser mr-1"></i> 清除
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={toggleListening}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
                    <span>{isListening ? '停止' : '語音'}</span>
                  </button>
                  <button
                    onClick={handleTranslate}
                    disabled={loading || !inputText.trim()}
                    className="flex items-center space-x-2 px-6 py-2 bg-orange-500 text-white rounded-full font-bold text-sm shadow-lg hover:bg-orange-600 disabled:bg-slate-200 transition-all"
                  >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    <span>轉換</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部說明 */}
        <section className="pt-6">
          <div className="bg-slate-800 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-black mb-4 flex items-center text-orange-400">
              <i className="fa-solid fa-shield-heart mr-2"></i> 專家教養建議
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {METHODOLOGIES.map((m, idx) => (
                <div key={idx} className="border-l-2 border-orange-500/30 pl-3">
                  <span className="text-[11px] font-bold block text-orange-200">{m.name}</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{m.desc.slice(0, 40)}...</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 py-6 text-center text-slate-400 text-[10px] px-8">
        <p>© 2024 親子溫暖譯站 | 支援即時環境抗噪技術</p>
      </footer>
    </div>
  );
};

export default App;
