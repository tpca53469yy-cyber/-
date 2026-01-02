
import { Scenario, ScenarioItem } from './types';

export const SCENARIOS: ScenarioItem[] = [
  { 
    type: Scenario.GENERAL, 
    icon: 'fa-comments', 
    placeholder: '例：你再不聽話我就不理你了！' 
  },
  { 
    type: Scenario.TANTRUM, 
    icon: 'fa-face-sad-tear', 
    placeholder: '例：閉嘴！不要再哭了，煩死了！' 
  },
  { 
    type: Scenario.HOMEWORK, 
    icon: 'fa-book-open', 
    placeholder: '例：現在立刻去寫功課，不然晚上不准看電視！' 
  },
  { 
    type: Scenario.SCREEN_TIME, 
    icon: 'fa-mobile-screen', 
    placeholder: '例：手機拿過來！你已經玩很久了！' 
  },
  { 
    type: Scenario.CHORES, 
    icon: 'fa-broom', 
    placeholder: '例：房間亂成這樣，你是豬嗎？快去收！' 
  },
  { 
    type: Scenario.MEALTIME, 
    icon: 'fa-utensils', 
    placeholder: '例：快點吃，不要挑食，不然以後長不高！' 
  }
];

export const METHODOLOGIES = [
  {
    name: "阿德勒心理學",
    core: "歸屬感與價值感",
    desc: "主張行為背後皆有目的，透過賦權而非懲罰，建立孩子的自尊與社會興趣。"
  },
  {
    name: "薩提爾溝通模式",
    core: "一致性表達",
    desc: "關注家長與孩子的內在冰山，從指責或討好的模式轉向真實、尊重的連結。"
  },
  {
    name: "正向教養 (Positive Discipline)",
    core: "溫和且堅定",
    desc: "由 Jane Nelsen 創立，強調在尊重孩子的同時保持界線，專注於解決方案。"
  }
];

export const SYSTEM_INSTRUCTION = `
你是一位精通正向教養（Positive Discipline）、阿德勒心理學及薩提爾模式的臨床心理導師。
你的任務是在家長面臨親子衝突時，擔任他們耳邊的「冷靜導師」。

核心指令：
1. 衝突過濾：如果音訊中包含孩子的哭鬧或尖叫，請自動忽略噪音，專注於聽取家長說出的話。
2. 階段性陪伴：
   - 第一階段：如果偵測到家長語氣極度焦慮，先給予一句 10 字內的安撫語（如：深呼吸，你現在做得很好了）。
   - 第二階段：將家長的情緒化語句翻譯成「連結重於修正」的正向語言。
3. 輸出格式：
   - 翻譯語句：口語化、溫柔、堅定。
   - 肢體建議：例如「深呼吸」、「蹲下視線齊平」。
   - 理論出處：簡短標註。

請確保在即時對話中反應速度極快（Low Latency）。
`;
