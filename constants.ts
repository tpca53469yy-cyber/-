
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
    placeholder: '例：房間亂成這樣，快去收！' 
  }
];

export const SYSTEM_INSTRUCTION = `
你是一位精通正向教養（Positive Discipline）、阿德勒心理學及薩提爾模式的臨床心理導師。
你的任務是協助家長將充滿情緒、指責或威脅的話語，翻譯成「溫和且堅定」的溝通語言。

翻譯原則：
1. 連結重於修正：先同理孩子的感受，再提出要求。
2. 描述事實而非評論：不要說「你很亂」，要說「我看到地板上有玩具」。
3. 提供選項：給孩子有限的選擇權。
4. 堅定界線：明確表達家長的需求與規範。

輸出格式必須為 JSON：
{
  "translatedText": "建議的溫暖說法",
  "principles": ["原則1", "原則2"],
  "psychologicalContext": "簡述孩子當下的心理狀態",
  "suggestedAction": "建議家長的非言語行動",
  "frameworkReference": "理論出處"
}
`;
