/**
 * Smart Hybrid Profile Relevance Matching Service
 * 
 * Computes an explainable hybrid compatibility score (0-100%) between two users:
 * - AI Semantic Similarity: 60%
 * - Professional/Skill compatibility: 20%
 * - Research compatibility: 10%
 * - Location proximity: 10%
 */

const {
  cosineSimilarity,
  normalizeSemanticScore
} = require('./aiEmbeddingService');
const { normalizeList } = require('./catalogService');

/**
 * Configurable weights for the hybrid matching formula
 */
const MATCH_WEIGHTS = {
  SEMANTIC: 0.60,
  SKILL: 0.20,
  RESEARCH: 0.10,
  LOCATION: 0.10
};

/**
 * Standardized Canonical Overlap Resolution.
 * Maps raw inputs to their canonical IDs, handles aliases, and counts each unique canonical entry once.
 */
const findCanonicalOverlap = (type, arr1 = [], arr2 = []) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length === 0 || arr2.length === 0) {
    return { commonCanonical: [], count: 0 };
  }

  const itemsA = normalizeList(type, arr1, { namesOnly: false });
  const itemsB = normalizeList(type, arr2, { namesOnly: false });

  const mapA = new Map();
  itemsA.forEach((item) => mapA.set(item.id, item.name));

  const matchedSet = new Set();
  const commonNames = [];

  itemsB.forEach((item) => {
    if (mapA.has(item.id) && !matchedSet.has(item.id)) {
      matchedSet.add(item.id);
      commonNames.push(mapA.get(item.id));
    }
  });

  return {
    commonCanonical: commonNames,
    count: matchedSet.size
  };
};

// Backward-compatible alias for existing callers
const findOverlap = (arr1 = [], arr2 = []) => {
  return findCanonicalOverlap('skill', arr1, arr2).commonCanonical;
};

/**
 * Calculates Skill Compatibility Score (0-100) using deduplicated canonical skills.
 */
const calculateSkillScore = (userA, userB, commonSkills = []) => {
  const normA = normalizeList('skill', userA.skills || [], { namesOnly: false });
  const normB = normalizeList('skill', userB.skills || [], { namesOnly: false });

  if (normA.length === 0 && normB.length === 0) {
    // If neither user listed skills, evaluate role match
    if (userA.role && userB.role && userA.role.toLowerCase() === userB.role.toLowerCase()) {
      return 60;
    }
    return 30;
  }

  const allSkillIds = new Set([
    ...normA.map((s) => s.id),
    ...normB.map((s) => s.id)
  ]);

  const jaccard = allSkillIds.size > 0 ? (commonSkills.length / allSkillIds.size) : 0;

  // Tiered count score
  let countScore = 0;
  if (commonSkills.length >= 4) countScore = 100;
  else if (commonSkills.length === 3) countScore = 85;
  else if (commonSkills.length === 2) countScore = 70;
  else if (commonSkills.length === 1) countScore = 50;
  else countScore = 0;

  // Add role match bonus if roles are similar
  let roleBonus = 0;
  if (userA.role && userB.role && userA.role.toLowerCase().trim() === userB.role.toLowerCase().trim()) {
    roleBonus = 15;
  }

  const score = Math.round(countScore * 0.7 + jaccard * 100 * 0.3 + roleBonus);
  return Math.min(Math.max(score, 0), 100);
};

/**
 * Calculates Research Compatibility Score (0-100) using canonical research topics and domains.
 */
const calculateResearchScore = (userA, userB, commonInterests = [], commonDomains = []) => {
  // Aggregate research interests and structured research topics
  const rawInterestsA = [
    ...(userA.researchInterests || []),
    ...((userA.researchTopics || []).map((t) => t.title))
  ];
  const rawInterestsB = [
    ...(userB.researchInterests || []),
    ...((userB.researchTopics || []).map((t) => t.title))
  ];

  const normInterestsA = normalizeList('interest', rawInterestsA, { namesOnly: false });
  const normInterestsB = normalizeList('interest', rawInterestsB, { namesOnly: false });
  const normDomainsA = normalizeList('domain', userA.researchDomains || [], { namesOnly: false });
  const normDomainsB = normalizeList('domain', userB.researchDomains || [], { namesOnly: false });

  const totalPossible = normInterestsA.length + normInterestsB.length + normDomainsA.length + normDomainsB.length;
  if (totalPossible === 0) {
    return 30; // Neutral baseline when research data not specified
  }

  const totalMatches = commonInterests.length + commonDomains.length;

  let score = 0;
  if (totalMatches >= 3) score = 95;
  else if (totalMatches === 2) score = 75;
  else if (totalMatches === 1) score = 50;
  else score = 10;

  return Math.min(Math.max(score, 0), 100);
};

/**
 * Calculates Location Proximity Score (0-100) based on distance within radius.
 */
const calculateLocationScore = (exactDistanceMeters, radiusMeters) => {
  if (typeof exactDistanceMeters !== 'number' || isNaN(exactDistanceMeters)) {
    return 70;
  }
  const radius = Number(radiusMeters) || 1000;

  if (exactDistanceMeters <= 50) return 100;
  if (exactDistanceMeters >= radius) return 10;

  const ratio = 1 - (exactDistanceMeters / radius);
  return Math.min(Math.max(Math.round(ratio * 100), 10), 100);
};

/**
 * Calculates full hybrid match score between requesting user and candidate user.
 * 
 * @param {Object} userA - Logged-in user
 * @param {Object} userB - Candidate user
 * @param {Object} options - { exactDistanceMeters, radiusMeters, vecA, vecB }
 * @returns {Object} Comprehensive match result
 */
const calculateMatchScore = (userA, userB, options = {}) => {
  if (!userA || !userB) {
    return {
      matchScore: 0,
      semanticScore: 0,
      skillScore: 0,
      researchScore: 0,
      locationScore: 0,
      matchReasons: [],
      matchExplanation: 'No profile comparison available.',
      matchDetails: { commonSkills: [], commonInterests: [], commonDomains: [] }
    };
  }

  const { commonCanonical: commonSkills } = findCanonicalOverlap('skill', userA.skills, userB.skills);

  const rawInterestsA = [
    ...(userA.researchInterests || []),
    ...((userA.researchTopics || []).map((t) => t.title))
  ];
  const rawInterestsB = [
    ...(userB.researchInterests || []),
    ...((userB.researchTopics || []).map((t) => t.title))
  ];
  const { commonCanonical: commonInterests } = findCanonicalOverlap('interest', rawInterestsA, rawInterestsB);

  const { commonCanonical: commonDomains } = findCanonicalOverlap('domain', userA.researchDomains, userB.researchDomains);

  // 1. AI SEMANTIC SIMILARITY (60% Weight)
  const vecA = options.vecA || userA.aiProfileEmbedding;
  const vecB = options.vecB || userB.aiProfileEmbedding;

  let semanticScore = 0;
  let isAiSemantic = false;
  let rawCosine = null;

  if (Array.isArray(vecA) && Array.isArray(vecB) && vecA.length > 0 && vecB.length > 0) {
    try {
      rawCosine = cosineSimilarity(vecA, vecB);
      semanticScore = normalizeSemanticScore(rawCosine);
      isAiSemantic = true;
    } catch (embErr) {
      console.warn('[MatchService] Embedding similarity failed, falling back to rule-based:', embErr.message);
      isAiSemantic = false;
    }
  }

  // Graceful Fallback if embeddings are missing/unavailable
  if (!isAiSemantic) {
    let fallbackScore = 20;
    if (commonInterests.length > 0) fallbackScore += commonInterests.length * 20;
    if (commonSkills.length > 0) fallbackScore += commonSkills.length * 15;
    if (userA.role && userB.role && userA.role.toLowerCase() === userB.role.toLowerCase()) fallbackScore += 15;
    semanticScore = Math.min(Math.max(fallbackScore, 20), 85);
  }

  // 2. SKILL COMPATIBILITY (20% Weight)
  const skillScore = calculateSkillScore(userA, userB, commonSkills);

  // 3. RESEARCH COMPATIBILITY (10% Weight)
  const researchScore = calculateResearchScore(userA, userB, commonInterests, commonDomains);

  // 4. LOCATION PROXIMITY (10% Weight)
  const locationScore = calculateLocationScore(options.exactDistanceMeters, options.radiusMeters);

  // 5. HYBRID SCORE SYNTHESIS
  const finalScore = Math.round(
    semanticScore * MATCH_WEIGHTS.SEMANTIC +
    skillScore * MATCH_WEIGHTS.SKILL +
    researchScore * MATCH_WEIGHTS.RESEARCH +
    locationScore * MATCH_WEIGHTS.LOCATION
  );

  // 6. EXPLAINABLE MATCH REASONS & HUMAN-READABLE EXPLANATION
  const exactReasons = [...new Set([...commonSkills, ...commonInterests, ...commonDomains])];
  let matchExplanation = '';

  if (exactReasons.length > 0) {
    if (semanticScore >= 70) {
      matchExplanation = `High semantic alignment with overlapping expertise in ${exactReasons.slice(0, 3).join(', ')}.`;
    } else {
      matchExplanation = `Shared background in ${exactReasons.slice(0, 3).join(', ')}.`;
    }
  } else {
    if (semanticScore >= 60) {
      matchExplanation = 'Your professional and research profiles are semantically related.';
    } else if (semanticScore >= 40) {
      matchExplanation = 'Complementary background with potential cross-disciplinary collaboration.';
    } else {
      matchExplanation = 'Geographic proximity within your selected discovery radius.';
    }
  }

  return {
    matchScore: Math.min(Math.max(finalScore, 10), 99),
    semanticScore,
    skillScore,
    researchScore,
    locationScore,
    matchReasons: exactReasons,
    matchExplanation,
    matchDetails: {
      commonSkillsCount: commonSkills.length,
      commonInterestsCount: commonInterests.length,
      commonSkills,
      commonInterests,
      commonDomains,
      isAiSemantic,
      rawCosineSimilarity: rawCosine !== null ? Number(rawCosine.toFixed(4)) : null,
      weights: MATCH_WEIGHTS
    }
  };
};

module.exports = {
  MATCH_WEIGHTS,
  calculateMatchScore,
  calculateSkillScore,
  calculateResearchScore,
  calculateLocationScore,
  findCanonicalOverlap,
  findOverlap
};
