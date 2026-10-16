/**
 * AI Semantic Embedding Service
 * 
 * Generates, manages, and calculates real vector embeddings for user profiles
 * using Xenova Transformers (all-MiniLM-L6-v2, 384 dimensions) locally/offline,
 * with optional fallback to OpenAI / external embedding APIs if configured in .env.
 */

const User = require('../models/User');

let pipelineInstance = null;
let pipelinePromise = null;

/**
 * Returns a cached singleton instance of the feature extraction pipeline.
 */
const getPipeline = async () => {
  if (pipelineInstance) {
    return pipelineInstance;
  }
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const { pipeline } = require('@xenova/transformers');
        console.log('[AI Embedding] Initializing local semantic embedding pipeline (Xenova/all-MiniLM-L6-v2)...');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[AI Embedding] Local pipeline ready.');
        pipelineInstance = extractor;
        return extractor;
      } catch (err) {
        console.error('[AI Embedding] Failed to initialize local pipeline:', err.message);
        pipelinePromise = null;
        throw err;
      }
    })();
  }
  return pipelinePromise;
};

/**
 * Generates normalized, privacy-safe text representation of a user profile.
 * Explicitly EXCLUDES passwords, emails, tokens, and exact GPS coordinates.
 * 
 * @param {Object} user 
 * @returns {string} Normalized semantic profile text
 */
const generateProfileText = (user) => {
  if (!user) return '';

  const parts = [];

  if (user.role) {
    parts.push(`Role: ${user.role}.`);
  }
  if (user.organization) {
    parts.push(`Organization: ${user.organization}.`);
  }
  if (user.bio) {
    parts.push(`Bio: ${user.bio}.`);
  }

  if (Array.isArray(user.skills) && user.skills.length > 0) {
    parts.push(`Skills: ${user.skills.join(', ')}.`);
  }

  if (Array.isArray(user.expertise) && user.expertise.length > 0) {
    parts.push(`Expertise: ${user.expertise.join(', ')}.`);
  }

  if (Array.isArray(user.researchInterests) && user.researchInterests.length > 0) {
    parts.push(`Research Interests: ${user.researchInterests.join(', ')}.`);
  }

  if (Array.isArray(user.researchDomains) && user.researchDomains.length > 0) {
    parts.push(`Research Domains: ${user.researchDomains.join(', ')}.`);
  }

  if (Array.isArray(user.collaboration?.collaborationAreas) && user.collaboration.collaborationAreas.length > 0) {
    parts.push(`Collaboration Areas: ${user.collaboration.collaborationAreas.join(', ')}.`);
  }

  // Include project descriptions & tech stacks
  if (Array.isArray(user.projects) && user.projects.length > 0) {
    const projectSummaries = user.projects
      .map(p => {
        let pStr = p.title || '';
        if (p.description) pStr += ` - ${p.description}`;
        if (Array.isArray(p.techStack) && p.techStack.length > 0) {
          pStr += ` (Tech: ${p.techStack.join(', ')})`;
        }
        return pStr;
      })
      .filter(Boolean);
    if (projectSummaries.length > 0) {
      parts.push(`Projects: ${projectSummaries.join('; ')}.`);
    }
  }

  // Include research publications
  if (Array.isArray(user.publications) && user.publications.length > 0) {
    const pubSummaries = user.publications
      .map(p => {
        let pStr = p.title || '';
        if (p.abstract) pStr += ` - ${p.abstract}`;
        if (Array.isArray(p.keywords) && p.keywords.length > 0) {
          pStr += ` (Keywords: ${p.keywords.join(', ')})`;
        }
        return pStr;
      })
      .filter(Boolean);
    if (pubSummaries.length > 0) {
      parts.push(`Publications: ${pubSummaries.join('; ')}.`);
    }
  }

  return parts.join(' ').trim();
};

/**
 * Generates an embedding vector for a given profile text.
 * Checks for external API keys first (if user sets OPENAI_API_KEY in .env),
 * otherwise defaults to local high-performance Xenova pipeline.
 * 
 * @param {string} text 
 * @returns {Promise<number[]|null>}
 */
const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  // 1. Check for OpenAI API key if user prefers remote API
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000)
        })
      });
      const data = await response.json();
      if (data.data && data.data[0] && data.data[0].embedding) {
        return data.data[0].embedding;
      }
    } catch (apiErr) {
      console.warn('[AI Embedding] External API error, falling back to local pipeline:', apiErr.message);
    }
  }

  // 2. Local Xenova Transformer pipeline (Default production/offline approach)
  try {
    const extractor = await getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error('[AI Embedding] Error generating embedding vector:', err.message);
    return null;
  }
};

/**
 * Calculates mathematical cosine similarity between two float vectors.
 * Returns value between -1 and 1 (typically 0.15 to 0.95 for text).
 * 
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number}
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  const length = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Normalizes cosine similarity to a calibrated 0-100% semantic score.
 * Sentence-transformers text similarity typically spans [0.20, 0.85].
 * 
 * @param {number} cosine 
 * @returns {number} Integer between 0 and 100
 */
const normalizeSemanticScore = (cosine) => {
  if (typeof cosine !== 'number' || isNaN(cosine)) return 0;
  const minCosine = 0.20;
  const maxCosine = 0.85;
  const clamped = Math.max(0, Math.min(1, (cosine - minCosine) / (maxCosine - minCosine)));
  return Math.round(clamped * 100);
};

/**
 * Generates and saves embedding for a user if outdated or missing.
 * 
 * @param {string|Object} userOrId 
 * @returns {Promise<number[]|null>}
 */
const updateUserEmbedding = async (userOrId) => {
  try {
    const user = typeof userOrId === 'string'
      ? await User.findById(userOrId).select('+aiProfileEmbedding')
      : userOrId;

    if (!user) return null;

    const profileText = generateProfileText(user);
    if (!profileText) return null;

    const embedding = await generateEmbedding(profileText);
    if (!embedding) return null;

    user.aiProfileEmbedding = embedding;
    user.aiEmbeddingUpdatedAt = new Date();
    user.aiProfileText = profileText;

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      await User.findByIdAndUpdate(user._id, {
        aiProfileEmbedding: embedding,
        aiEmbeddingUpdatedAt: new Date(),
        aiProfileText: profileText
      });
    }

    return embedding;
  } catch (err) {
    console.error(`[AI Embedding] Failed to update embedding for user:`, err.message);
    return null;
  }
};

/**
 * Ensures user has an embedding. Returns existing or generates new.
 * 
 * @param {Object} user 
 * @returns {Promise<number[]|null>}
 */
const ensureUserEmbedding = async (user) => {
  if (!user) return null;
  if (Array.isArray(user.aiProfileEmbedding) && user.aiProfileEmbedding.length > 0) {
    return user.aiProfileEmbedding;
  }
  // Generate lazily and persist
  return await updateUserEmbedding(user);
};

module.exports = {
  generateProfileText,
  generateEmbedding,
  cosineSimilarity,
  normalizeSemanticScore,
  updateUserEmbedding,
  ensureUserEmbedding
};
