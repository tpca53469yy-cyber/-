
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 直接引用環境變數
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("找不到 API 金鑰，請確認 Vercel 環境變數設定。");
  }

  // 每次調用時建立實例，確保獲取最新狀態
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Output valid JSON ONLY. Start directly with {.",
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
      
      // 優化的流式解析邏輯
      try {
        // 嘗試找出 "translatedText" 欄位的內容
        const translatedTextMatch = fullContent.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (translatedTextMatch && translatedTextMatch[1]) {
          // 處理已完成或未完成的字串
          let partial = translatedTextMatch[1];
          // 如果字串已閉合，去掉結尾引號
          if (partial.endsWith('"') && !partial.endsWith('\\"')) {
            partial = partial.slice(0, -1);
          }
          const cleanText = partial.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          onChunk(cleanText);
        }
      } catch (e) {
        // 解析中間過程出錯不中斷
      }
    }

    // 最終解析完整的 JSON
    const cleanJson = fullContent.replace(/^```json\s*|```$/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      return {
        ...parsed,
        originalText: text
      };
    } catch (parseError) {
      console.error("JSON Parse Error:", fullContent);
      throw new Error("內容解析失敗，請再試一次。");
    }
  } catch (error: any) {
    console.error("Gemini API Detail Error:", error);
    // 拋出具體的錯誤訊息，而不是模糊的「系統忙碌」
    const errorMessage = error.message || "未知錯誤";
    throw new Error(`API 錯誤: ${errorMessage}`);
  }
};
