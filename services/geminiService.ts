
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // 嘗試獲取 API Key
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY_MISSING");
  }

  // 使用專業版模型：gemini-3-pro-preview
  // 這能處理更細微的情緒與心理需求分析
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-pro-preview",
      contents: `情境：${scenario}\n家長原本想說的話：${text}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Start with the 'translatedText' field immediately. Keep psychological context deep but concise.",
        thinkingConfig: { thinkingBudget: 32768 }, // 為 Pro 模型提供思考空間
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
    // 如果報錯包含「Requested entity was not found」，通常是 Key 的問題
    if (error.message?.includes("not found") || error.message?.includes("403") || error.message?.includes("API key")) {
      throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};
