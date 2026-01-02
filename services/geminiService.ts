
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParenting = async (text: string, scenario: Scenario): Promise<TranslationResult> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("找不到 API 金鑰。請確認 Vercel 環境變數設定為 API_KEY，或者使用金鑰選取器。");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            principles: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            psychologicalContext: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            frameworkReference: { type: Type.STRING }
          },
          required: ["translatedText", "principles", "psychologicalContext", "suggestedAction", "frameworkReference"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("API 回傳內容為空");
    
    const result = JSON.parse(jsonStr.trim());
    return {
      ...result,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    // 拋出更具體的錯誤訊息
    throw new Error(error.message || "呼叫 API 時發生未知錯誤");
  }
};
