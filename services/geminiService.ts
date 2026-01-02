
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 優先從 Vercel 注入的標準環境變數讀取
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    console.error("API Key 缺失，請檢查 Vercel 環境變數設定。");
    throw new Error("API_KEY_MISSING");
  }

  // 每次調用都創建新實例以確保抓到最新的 Key
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Start with the 'translatedText' field immediately. Be as concise and fast as possible.",
        thinkingConfig: { thinkingBudget: 0 },
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
          propertyOrdering: ["translatedText", "principles", "psychologicalContext", "suggestedAction", "frameworkReference"],
          required: ["translatedText", "principles", "psychologicalContext", "suggestedAction", "frameworkReference"]
        }
      }
    });

    let fullContent = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      fullContent += chunkText;
      
      try {
        // 嘗試提取正在生成的翻譯文字，提供即時體感
        const match = fullContent.match(/"translatedText"\s*:\s*"([^"]*)/);
        if (match && match[1]) {
          onChunk(match[1].replace(/\\n/g, '\n'));
        }
      } catch (e) {
        // 忽略 JSON 尚未閉合時的解析錯誤
      }
    }

    const parsed = JSON.parse(fullContent);
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("403") || error.message?.includes("API key not found")) {
      throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};
