
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 安全地獲取 API Key，不再進行報錯攔截
  const getApiKey = () => {
    try {
      return process.env.API_KEY;
    } catch (e) {
      return undefined;
    }
  };

  const apiKey = getApiKey();
  
  // 建立新的 AI 實例
  const ai = new GoogleGenAI({ apiKey: apiKey as string });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: You MUST output valid JSON. Do not include markdown code blocks. Start your response with {.",
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
      
      // 流式解析預覽：尋找 translatedText 的內容
      try {
        const match = fullContent.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (match && match[1]) {
          let partial = match[1];
          // 如果偵測到引號閉合，截斷它
          if (partial.endsWith('"') && !partial.endsWith('\\"')) {
            partial = partial.slice(0, -1);
          }
          onChunk(partial.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
        }
      } catch (e) {}
    }

    // 最終解析
    const cleanJson = fullContent.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 如果是金鑰問題，提供清楚的錯誤引導
    if (error.message?.includes("API key") || error.message?.includes("403") || error.message?.includes("not found")) {
      throw new Error("金鑰無效或未配置。若您在 Vercel 部署，請確保環境變數已設為 API_KEY。");
    }
    throw new Error("服務暫時無法回應，請稍後再試。");
  }
};
