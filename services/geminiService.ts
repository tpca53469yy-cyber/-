
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types.ts";
import { SYSTEM_INSTRUCTION } from "../constants.ts";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 直接從 process.env.API_KEY 初始化，這在 Vercel 佈署環境中應自動生效
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
      const chunkText = chunk.text || "";
      fullContent += chunkText;
      
      // 嘗試從不完整的 JSON 提取翻譯文本以供流式顯示
      try {
        const match = fullContent.match(/"translatedText"\s*:\s*"([^"]*)"?/);
        if (match && match[1]) {
          // 清理可能轉義的字串
          const cleanText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          onChunk(cleanText);
        }
      } catch (e) {
        // 忽略 JSON 片段解析錯誤
      }
    }

    const parsed = JSON.parse(fullContent.trim());
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    throw error;
  }
};
