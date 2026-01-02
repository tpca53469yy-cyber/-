
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 優先從環境變數讀取 API Key
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("系統金鑰配置中，請稍候再試。");
  }

  // 每次調用重新初始化以確保抓取最新環境變數
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: You MUST output valid JSON. Do not include markdown code blocks like ```json. Start your response directly with the opening brace {.",
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
      
      // 改進的流式解析：尋找 translatedText 的值
      try {
        const match = fullContent.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match && match[1]) {
          // 處理轉義字符
          const cleanText = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          onChunk(cleanText);
        } else {
          // 如果還沒閉合引號，嘗試抓取目前的片段
          const partialMatch = fullContent.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)$/);
          if (partialMatch && partialMatch[1]) {
            const cleanPartial = partialMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            onChunk(cleanPartial);
          }
        }
      } catch (e) {
        // 忽略解析過程中的暫時錯誤
      }
    }

    // 清理可能出現的 markdown 標記
    const cleanJson = fullContent.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    // 提供更具體的錯誤提示，幫助排查
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("403")) {
      throw new Error("金鑰無效，請檢查環境變數設定。");
    }
    throw new Error("服務目前忙碌中，請稍微調整話語後再試一次。");
  }
};
