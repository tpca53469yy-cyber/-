
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 直接使用環境變數中的 API_KEY。在 Vercel 設定後，此變數應自動注入。
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
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

    let fullContent = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      fullContent += chunkText;
      
      // 即時解析 JSON 片段以獲得平滑的打字效果
      try {
        const match = fullContent.match(/"translatedText":\s*"([^"]*)"?/);
        if (match && match[1]) {
          const cleanText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          onChunk(cleanText);
        }
      } catch (e) {
        // 忽略解析中的 JSON 不完整錯誤
      }
    }

    const result = JSON.parse(fullContent.trim());
    return {
      ...result,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
