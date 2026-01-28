import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class LLMClient {
    private apiKey: string;
    private provider: string;

    constructor() {
        this.apiKey = process.env.LLM_API_KEY || "";
        this.provider = process.env.LLM_PROVIDER || "gemini"; // Default to gemini
    }

    async generate(systemPrompt: string, userPrompt: string): Promise<string> {
        if (!this.apiKey) {
            console.warn("⚠️ LLM_API_KEY not found. Using mock response.");
            return "Mocked test response from LLM (No API Key provided)";
        }

        try {
            if (this.provider === "gemini") {
                const genAI = new GoogleGenerativeAI(this.apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                return response.text();
            } else if (this.provider === "groq") {
                const response = await axios.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        model: "llama-3.1-8b-instant",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        temperature: 0.2
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                            "Content-Type": "application/json"
                        }
                    }
                );
                return response.data.choices[0].message.content;
            }
            return `Unsupported provider: ${this.provider}`;
        } catch (error: any) {
            console.error(`❌ LLM Generation failed (${this.provider}):`, error.message);
            throw error;
        }
    }
}
