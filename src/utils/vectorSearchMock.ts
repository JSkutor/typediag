/**
 * Vector Search Mock
 * 
 * Local utility to simulate PostgreSQL pgvector similarity search.
 */

/**
 * Calculates the cosine similarity between two vectors.
 * 
 * @param vecA First vector (e.g., query embedding)
 * @param vecB Second vector (e.g., target embedding)
 * @returns Cosine similarity score between -1 and 1
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be of the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds the top K most similar items from a list of targets given a query embedding.
 * 
 * @param queryEmbedding The vector representing the user's search query
 * @param targets The list of targets to search against
 * @param topK Number of results to return
 * @returns Array of targets augmented with their similarity score, sorted by similarity descending
 */
export function findNearestNeighbors<T extends { embedding?: number[] }>(
  queryEmbedding: number[],
  targets: T[],
  topK: number = 5
): Array<T & { similarity: number }> {
  const results = targets
    .filter(target => target.embedding && target.embedding.length === queryEmbedding.length)
    .map(target => ({
      ...target,
      similarity: cosineSimilarity(queryEmbedding, target.embedding as number[])
    }))
    .sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, topK);
}
