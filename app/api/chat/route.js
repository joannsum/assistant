import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI with your API key
const apiKey = process.env.GOOGLE_API_KEY; // Ensure this is set in your .env file
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(req) {
  try {
    const { messages } = await req.json(); // Extract JSON data from the request

    const prompt = messages.map(msg => msg.content).join(' ');
    const result = await model.generateContent(prompt);
    const response = result.response;

    return new Response(JSON.stringify({ response }), { status: 200 });
  } catch (error) {
    console.error('Error generating content:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
