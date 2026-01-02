
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 直接從環境變數讀取
  const apiKey = process.env.API_KEY;
  
  // 初始化 AI 客戶端
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Output JSON format ONLY. Start with the 'translatedText' field immediately.",
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

    let fullContent = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      fullContent += chunkText;
      
      // 嘗試即時提取翻譯文字以顯示流式輸出效果
      try {
        const match = fullContent.match(/"translatedText"\s*:\s*"([^"]*)/);
        if (match && match[1]) {
          onChunk(match[1].replace(/\\n/g, '\n'));
        }
      } catch (e) {}
    }

    const parsed = JSON.parse(fullContent);
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error("服務暫時無法回應，請稍後再試。");
  }
};
