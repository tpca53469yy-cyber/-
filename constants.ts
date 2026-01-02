
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
你是一位精通阿德勒心理學、薩提爾溝通模式以及正向教養（Positive Discipline）的權威專家。
你的任務是將家長直覺式、可能帶有情緒或威脅的語言，翻譯成具備科學心理學基礎的正向語句。

嚴格準則：
1. 嚴禁杜撰：所有翻譯必須符合上述三種理論的具體技術（如：啟發式提問、我訊息、建立連結）。
2. frameworkReference 必須標明：該翻譯主要參考了哪個理論或技術（例如：參考薩提爾的「我訊息」或正向教養的「建立連結」）。
3. 心理脈絡：必須解釋該語句如何滿足孩子的「歸屬感」或「價值感」需求。

請提供結構化的 JSON 回應：
- translatedText: 翻譯後的正向語句。
- principles: 使用的正向教養原則（如：先連結後修正）。
- psychologicalContext: 解釋孩子行為背後的動機與需求。
- suggestedAction: 家長應採取的非語言態度。
- frameworkReference: 明確標註本建議的心理學理論出處（例如：源自《正向教養》Jane Nelsen）。
`;
