
import { GoogleGenAI, Type } from "@google/genai";

export const getGeminiResponse = async (prompt: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Expert advice currently unavailable. Please try again.";
  }
};

export const fetchMandiPrices = async (query: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide the latest Mandi prices and market trends for: ${query}. Include 1. Current Price (min-max), 2. Market Arrival Status, 3. Price Trend (Rising/Falling). Also provide a brief reason for the trend.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Mandi Fetch Error:", error);
    return { text: "Unable to fetch real-time prices. Please check your connection.", sources: [] };
  }
};

export const detectPestAndDisease = async (base64Image: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify the crop disease or pest. Provide: 1. Name, 2. Treatment (Organic & Chemical), 3. Urgency (High/Medium/Low). Respond in structured JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            condition: { type: Type.STRING },
            treatment: { type: Type.STRING },
            urgency: { type: Type.STRING }
          },
          required: ["condition", "treatment", "urgency"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { condition: "Scan Error", treatment: "Please retry.", urgency: "Low" };
  }
};
