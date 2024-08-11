// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const port = 3001;

// Google API Key
const API_KEY = process.env.GOOGLE_API_KEY;
// console.log('API Key:', API_KEY); // Log the API key for debugging (remove in production)

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(express.json());

// Set up the API endpoint for generating text
app.post('/generate', async (req, res) => {
  const { messages } = req.body;
  
  try {
    // Construct the prompt from the message history
    const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\nassistant:';

    console.log('Sending prompt to Gemini:', prompt); // Log the prompt

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Received response from Gemini:', text); // Log the response

    res.json({ role: 'assistant', content: text });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response: ' + error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});