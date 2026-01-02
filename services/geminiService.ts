
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParenting = async (text: string, scenario: Scenario): Promise<TranslationResult> => {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `情境：${scenario}\n家長想說的話：${text}`,
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

  // Use response.text property to extract the generated text
  const jsonStr = response.text || "{}";
  const result = JSON.parse(jsonStr.trim());
  return {
    ...result,
    originalText: text
  };
};
