
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Server API Key is missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `
      You are Antigravity, an advanced AI coding agent.
      Your goal is to help the user build a web project.
      
      You must respond with a JSON object containing a list of steps to execute.
      Each step should have:
- action: "BROWSE" | "WRITE" | "THINK"
  - description: A short description of what you are doing.
      - data:
- For BROWSE: { url: string }
- For WRITE: { filename: string, content: string, type: "file" | "folder" }
- For THINK: null

Example:
{
  "steps": [
    { "action": "THINK", "description": "Analyzing requirements...", "data": null },
    { "action": "BROWSE", "description": "Checking documentation", "data": { "url": "https://react.dev" } },
    { "action": "WRITE", "description": "Creating main page", "data": { "filename": "page.tsx", "content": "...", "type": "file" } }
  ]
}

      User Request: ${prompt}
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = result.response.text();
    return NextResponse.json(JSON.parse(response));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
