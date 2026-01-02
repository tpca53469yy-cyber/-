
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { TranslationResult, Scenario } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const translateToPositiveParentingStream = async (
  text: string, 
  scenario: Scenario,
  onChunk: (partialText: string) => void
): Promise<TranslationResult> => {
  // Safe access to process.env
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;

  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY_MISSING");
  }

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
        const match = fullContent.match(/"translatedText"\s*:\s*"([^"]*)/);
        if (match && match[1]) {
          onChunk(match[1].replace(/\\n/g, '\n'));
        }
      } catch (e) {
        // Ignore partial parse errors
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
