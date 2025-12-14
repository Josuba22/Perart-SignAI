/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { SignatureAnalysisResult } from "../types";

/**
 * Helper para garantir que a chave existe
 */
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("ERRO CRÍTICO: Chave da API (VITE_GEMINI_API_KEY) não encontrada.");
    throw new Error("API Key is missing");
  }
  return key;
};

/**
 * Analyzes a signature image (base64) using Gemini 3 Pro Preview with Thinking Mode.
 */
export const analyzeSignature = async (base64Image: string): Promise<SignatureAnalysisResult> => {
  try {
    // Instantiate client with the VITE specific env variable
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // Remove data:image/png;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const modelId = "gemini-2.0-flash-thinking-exp-01-21"; // Ajuste para modelo estável se o 3-preview falhar

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: `Analise esta imagem de assinatura detalhadamente.
            1. Identifique o nome escrito na assinatura (se legível).
            2. Avalie a legibilidade em uma escala de 1 a 10.
            3. Forneça uma avaliação profissional de grafologia (análise de caligrafia) sobre a personalidade baseada nos traços, pressão e inclinação.
            4. Comente sobre o profissionalismo da assinatura.
            
            Responda EXCLUSIVAMENTE em Português do Brasil. Seja minucioso e atencioso em sua análise.`,
          },
        ],
      },
      config: {
        // High thinking budget for deep analysis of handwriting traits
        thinkingConfig: {
            thinkingBudget: 1024 // Reduzido levemente para evitar timeouts em conexões lentas
        }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedName: { type: Type.STRING, description: "O nome identificado na assinatura" },
            legibilityScore: { type: Type.NUMBER, description: "Pontuação de 1 a 10" },
            personalityTraits: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Lista de 3-5 traços de personalidade derivados da grafologia (em Português)"
            },
            professionalism: { type: Type.STRING, description: "Avaliação da aparência profissional (em Português)" },
            graphologySummary: { type: Type.STRING, description: "Um parágrafo detalhado explicando a análise (em Português)" },
          },
          required: ["identifiedName", "legibilityScore", "personalityTraits", "professionalism", "graphologySummary"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from AI");
    }

    return JSON.parse(resultText) as SignatureAnalysisResult;

  } catch (error) {
    console.error("Error analyzing signature:", error);
    throw error;
  }
};

/**
 * Converts a raw photo of a signature into a high-quality, high-resolution digital PNG.
 */
export const digitizeSignature = async (base64Image: string): Promise<string> => {
  try {
    // Instantiate client here to ensure latest API key is used
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    // Use Gemini 2.5 Flash Image for robust image editing and cleanup tasks
    const modelId = "gemini-2.5-flash-image"; // Verifique se sua conta tem acesso a este modelo, senão use gemini-1.5-flash

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          },
          {
            text: "Transform this image into a pristine, high-resolution digital signature. Extract the handwriting as solid black lines on a clean white background. Remove all paper texture, shadows, perspective distortion, and noise. The result should look like a vector scan.",
          },
        ],
      },
    });

    // Extract the generated image from response
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No image generated.");

  } catch (error) {
    console.error("Error digitizing signature:", error);
    throw error;
  }
};