
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // Use process.env.API_KEY directly as per SDK guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `情境：${scenario}\n家長原本想說的話：${text}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nCRITICAL: Start with the 'translatedText' field immediately. Be as concise and fast as possible.",
      thinkingConfig: { thinkingBudget: 0 }, // 禁用深度推理以追求極致速度
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
    
    // 嘗試從不完整的 JSON 中提取 translatedText 以實現即時顯示
    try {
      const match = fullContent.match(/"translatedText"\s*:\s*"([^"]*)/);
      if (match && match[1]) {
        onChunk(match[1]);
      }
    } catch (e) {
      // 忽略部分解析錯誤
    }
  }

  const parsed = JSON.parse(fullContent);
  return {
    ...parsed,
    originalText: text
  };
};
