
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 直接讀取，不進行會導致攔截的嚴格檢查
  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Output valid JSON ONLY. Do not include ```json markdown. Start directly with {.",
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
      
      // 流式解析預覽內容
      try {
        const match = fullContent.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match && match[1]) {
          onChunk(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
        }
      } catch (e) {}
    }

    // 清理並解析
    const cleanJson = fullContent.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      ...parsed,
      originalText: text
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 只有在真的發生錯誤時才提示
    throw new Error("目前服務忙碌，請稍後再試。");
  }
};
