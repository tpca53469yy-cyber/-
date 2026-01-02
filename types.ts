
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  principles: string[];
  psychologicalContext: string;
  suggestedAction: string;
  frameworkReference: string; // 新增：理論根據出處
}

export enum Scenario {
  TANTRUM = '情緒崩潰/哭鬧',
  HOMEWORK = '寫功課/學習',
  CHORES = '做家事/整理',
  SCREEN_TIME = '使用手機/平板',
  SAFETY = '安全提醒/危險行為',
  MEALTIME = '吃飯/挑食',
  GENERAL = '一般溝通'
}

export interface ScenarioItem {
  type: Scenario;
  icon: string;
  placeholder: string;
}
