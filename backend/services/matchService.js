/**
 * Smart Profile Relevance Matching Service
 * 
 * Computes a compatibility score (0-100%) between a requesting user and a candidate user
 * based on overlap in skills, research interests, and professional domains.
 * Modular design allows future enhancement with AI/embedding vector search.
 */

/**
 * Calculates match percentage and details summary.
 * @param {Object} userA - Logged-in requesting user profile object
 * @param {Object} userB - Nearby candidate user profile object
 * @returns {Object} { matchScore: Number, matchDetails: { commonSkills: [], commonInterests: [], commonDomains: [] } }
 */
const calculateMatchScore = (userA, userB) => {
  if (!userA || !userB) {
    return { matchScore: 0, matchDetails: { commonSkills: [], commonInterests: [], commonDomains: [] } };
  }

  // Helper for case-insensitive array string matching
  const findOverlap = (arr1 = [], arr2 = []) => {
    const set1 = new Set(arr1.map(item => item.toLowerCase().trim()));
    return arr2.filter(item => set1.has(item.toLowerCase().trim()));
  };

  const commonSkills = findOverlap(userA.skills || [], userB.skills || []);
  const commonInterests = findOverlap(userA.researchInterests || [], userB.researchInterests || []);
  const commonDomains = findOverlap(userA.researchDomains || [], userB.researchDomains || []);

  // Weightings: Research Interests (40%), Skills (40%), Domain / Org similarity (20%)
  let score = 0;

  // Research interest score (up to 40 pts)
  if (commonInterests.length >= 3) score += 40;
  else score += commonInterests.length * 13;

  // Skills score (up to 40 pts)
  if (commonSkills.length >= 4) score += 40;
  else score += commonSkills.length * 10;

  // Domain & Role match score (up to 20 pts)
  if (commonDomains.length > 0) score += 10;
  if (userA.role && userB.role && userA.role.toLowerCase() === userB.role.toLowerCase()) score += 10;

  // Ensure baseline 50% score if there's any matching skill or interest, cap max score at 98% for realistic feel
  if (score === 0 && (commonSkills.length > 0 || commonInterests.length > 0)) {
    score = 45;
  } else if (score < 40 && (commonSkills.length > 0 || commonInterests.length > 0)) {
    score = score + 35;
  }

  const finalScore = Math.min(Math.max(score, 35), 98);

  return {
    matchScore: finalScore,
    matchDetails: {
      commonSkillsCount: commonSkills.length,
      commonInterestsCount: commonInterests.length,
      commonSkills,
      commonInterests,
      commonDomains
    }
  };
};

module.exports = { calculateMatchScore };
