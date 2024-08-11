import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function searchSimilarMovies(query, limit = 5) {
  // Remove common words and punctuation from the query
  const cleanQuery = query.replace(/can you tell me about|what do you know about|information on|details about|[?.,]/gi, '').trim();
  
  const { data, error } = await supabase.rpc('match_movies', {
    query_text: cleanQuery,
    match_count: limit
  });

  if (error) {
    console.error('Error in searchSimilarMovies:', error);
    return [];
  }

  console.log('Similar movies found:', data);
  return data;
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1].content;
    console.log('Received user message:', lastUserMessage);

    // Search for similar movies
    const similarMovies = await searchSimilarMovies(lastUserMessage);

    // Prepare context from similar movies
    const movieContext = similarMovies.map(movie => 
      `Title: ${movie.title}\nOverview: ${movie.overview}\nRelevance: ${movie.relevance.toFixed(2)}`
    ).join('\n\n');

    console.log('Movie context:', movieContext);

    // Prepare the prompt
    const prompt = `
      You are a helpful movie assistant. Use the following context about relevant movies to answer the user's question. The movies are listed with their relevance scores to the user's query. Focus on the most relevant movies (higher relevance scores) when crafting your response. If a movie with a relevance score of 0.5 or above is found, make sure to provide its details in your response.

      If the user is asking about a specific movie and it's in the context, provide details about that movie. If it's not in the context, politely inform the user that you don't have information about that specific movie and offer to provide information about similar movies if available.

      Context about relevant movies:
      ${movieContext}

      Chat history:
      ${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

      Human: ${lastUserMessage}
      Assistant: Based on the movies in the context and the user's question, here's my response:`;

    console.log('Generated prompt:', prompt);

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Generated response:', text);

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}