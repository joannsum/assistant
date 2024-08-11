// app/api/chat/route.js
import { NextResponse } from 'next/server';

const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:3001';

export async function POST(req) {
    const messages = await req.json();

    try {
        console.log('Sending request to Gemini server:', JSON.stringify(messages));
        console.log('Model server URL:', MODEL_SERVER_URL);
        
        const response = await fetch(`${MODEL_SERVER_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response from Gemini server:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        
        // Return only the content of the response
        return new NextResponse(data.content, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (err) {
        console.error('Error in API route:', err);
        return new NextResponse(`Error: ${err.message}. Please try again later.`, { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    }
}