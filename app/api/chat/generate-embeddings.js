//This file is for generating new embeddings in the supabase movies table. It parses the table 5 at a time though. 
//to be run when new movies added to movies table in supabase project

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({path:'.env.local'});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function createEmbedding(text) {
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    return result.embedding;
  }
  
  function ensureEmbeddingArray(embedding) {
    if (Array.isArray(embedding)) {
      return embedding;
    } else if (typeof embedding === 'object' && embedding !== null) {
      return Object.values(embedding);
    } else if (typeof embedding === 'string') {
      try {
        return JSON.parse(embedding);
      } catch (e) {
        console.error('Failed to parse embedding string:', e);
        return [];
      }
    } else {
      console.error('Unexpected embedding type:', typeof embedding);
      return [];
    }
  }
  
  function formatEmbedding(embedding) {
    const embeddingArray = ensureEmbeddingArray(embedding);
    return `[${embeddingArray.join(',')}]`;
  }
  
  function logEmbeddingSample(embedding) {
    const embeddingArray = ensureEmbeddingArray(embedding);
    const sample = embeddingArray.slice(0, 5);
    return `[${sample.join(', ')}...] (${embeddingArray.length} dimensions)`;
  }
  
  async function generateEmbeddings() {
    let processedCount = 0;
    let hasMore = true;
    const batchSize = 5; // Process 5 movies at a time to avoid rate limiting
  
    while (hasMore) {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, overview')
        .is('embedding', null)
        .range(processedCount, processedCount + batchSize - 1);
  
      if (error) {
        console.error('Error fetching movies:', error);
        return;
      }
  
      if (movies.length === 0) {
        hasMore = false;
        console.log('No more movies to process.');
        break;
      }
  
      console.log(`Processing batch of ${movies.length} movies.`);
  
      for (const movie of movies) {
        try {
          const embedding = await createEmbedding(movie.overview);
          console.log(`Generated embedding for movie ${movie.id}:`, logEmbeddingSample(embedding));
          
          const formattedEmbedding = formatEmbedding(embedding);
          
          const { data, error: updateError } = await supabase
            .from('movies')
            .update({ embedding: formattedEmbedding })
            .eq('id', movie.id)
            .select();
  
          if (updateError) {
            console.error(`Error updating movie ${movie.id}:`, updateError);
          } else if (data) {
            console.log(`Updated embedding for movie ${movie.id}. Rows affected:`, data.length);
            
            // Verify the update
            const { data: verifyData, error: verifyError } = await supabase
              .from('movies')
              .select('id, embedding')
              .eq('id', movie.id)
              .single();
            
            if (verifyError) {
              console.error(`Error verifying update for movie ${movie.id}:`, verifyError);
            } else if (verifyData && verifyData.embedding) {
              console.log(`Verified embedding for movie ${movie.id}:`, logEmbeddingSample(verifyData.embedding));
            } else {
              console.log(`Failed to verify embedding for movie ${movie.id}. Data:`, verifyData);
            }
          } else {
            console.log(`No data returned for movie ${movie.id}. This might indicate no changes were made.`);
          }
        } catch (err) {
          console.error(`Error processing movie ${movie.id}:`, err);
        }
      }
  
      processedCount += movies.length;
      console.log(`Processed ${processedCount} movies so far.`);
  
      // Add a small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  
    console.log('Finished processing all movies.');
  }
  
  async function main() {
    await generateEmbeddings();
  }
  
  main().catch(console.error);