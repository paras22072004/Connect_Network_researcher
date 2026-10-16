/**
 * Comprehensive Test Suite for AI Semantic & Hybrid Match System
 * Covers all required test scenarios:
 * 1. Very similar profiles → high semantic similarity
 * 2. Related but different terminology → meaningful similarity
 * 3. Completely unrelated profiles → low similarity
 * 4. Same skills but different research areas
 * 5. Same research areas but different skills
 * 6. Nearby but unrelated user
 * 7. Highly relevant user who is farther away
 * 8. Missing embedding (graceful fallback)
 * 9. AI service unavailable (graceful fallback)
 */

const {
  generateProfileText,
  generateEmbedding,
  cosineSimilarity,
  normalizeSemanticScore
} = require('../services/aiEmbeddingService');

const {
  calculateMatchScore,
  MATCH_WEIGHTS
} = require('../services/matchService');

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING GEOCONNECT HYBRID AI MATCHING TEST SUITE');
  console.log('===============================================================\n');

  // Define test profiles
  const profileBase = {
    _id: 'user_base',
    name: 'Alice (Core ML Researcher)',
    role: 'Machine Learning Researcher',
    organization: 'AI Institute',
    bio: 'Focused on deep learning models and computer vision systems.',
    skills: ['Python', 'PyTorch', 'Computer Vision', 'Deep Learning'],
    researchInterests: ['Neural Networks', 'Representation Learning', 'Object Detection'],
    researchDomains: ['Artificial Intelligence']
  };

  // 1. Very similar profile (almost identical keywords & domain)
  const profileVerySimilar = {
    _id: 'user_very_similar',
    name: 'Bob (Identical ML Researcher)',
    role: 'Machine Learning Researcher',
    organization: 'AI Institute',
    bio: 'Developing deep learning and computer vision architectures.',
    skills: ['Python', 'PyTorch', 'Computer Vision', 'Deep Learning'],
    researchInterests: ['Neural Networks', 'Representation Learning', 'Object Detection'],
    researchDomains: ['Artificial Intelligence']
  };

  // 2. Related profile but different terminology (no/few keyword overlaps)
  const profileRelatedTerms = {
    _id: 'user_related_terms',
    name: 'Charlie (Image & Cognitive Computing)',
    role: 'Cognitive Computing Scientist',
    organization: 'Vision Lab',
    bio: 'Working on visual perception, feature extraction, and convolutional models.',
    skills: ['C++', 'TensorFlow', 'Image Processing', 'Pattern Recognition'],
    researchInterests: ['Semantic Segmentation', 'Visual Intelligence', 'Automated Detection'],
    researchDomains: ['Computational Perception']
  };

  // 3. Completely unrelated profile
  const profileUnrelated = {
    _id: 'user_unrelated',
    name: 'Diana (Medieval Historian)',
    role: 'Medieval History Scholar',
    organization: 'Historical Archives Society',
    bio: 'Researching 13th century Latin manuscripts and monastic chronicles.',
    skills: ['Latin Translation', 'Paleography', 'Archival Curation', 'Bookbinding'],
    researchInterests: ['Medieval Monasticism', 'Manuscript Illumination', 'Ecclesiastical Law'],
    researchDomains: ['Humanities & History']
  };

  // 4. Same skills but different research areas
  const profileSameSkillsDiffResearch = {
    _id: 'user_same_skills',
    name: 'Edward (Bioinformatics Dev)',
    role: 'Bioinformatics Developer',
    organization: 'Genomics Center',
    bio: 'Applying statistical pipelines to genomic sequence alignments.',
    skills: ['Python', 'PyTorch', 'Deep Learning'],
    researchInterests: ['CRISPR Gene Editing', 'Phylogenetics', 'Protein Folding'],
    researchDomains: ['Computational Biology']
  };

  // 5. Same research areas but different skills
  const profileSameResearchDiffSkills = {
    _id: 'user_same_research',
    name: 'Fiona (Theoretical Vision Scientist)',
    role: 'Theoretical Vision Scientist',
    organization: 'Math Institute',
    bio: 'Proving convergence bounds for representation learning in object detection.',
    skills: ['MATLAB', 'R', 'LaTeX', 'Mathematica'],
    researchInterests: ['Neural Networks', 'Representation Learning', 'Object Detection'],
    researchDomains: ['Artificial Intelligence']
  };

  // Generate real vector embeddings for all test profiles
  console.log('Generating AI vector embeddings via local Xenova MiniLM model...');
  const textBase = generateProfileText(profileBase);
  const textVerySimilar = generateProfileText(profileVerySimilar);
  const textRelatedTerms = generateProfileText(profileRelatedTerms);
  const textUnrelated = generateProfileText(profileUnrelated);
  const textSameSkills = generateProfileText(profileSameSkillsDiffResearch);
  const textSameResearch = generateProfileText(profileSameResearchDiffSkills);

  const [embBase, embVerySimilar, embRelatedTerms, embUnrelated, embSameSkills, embSameResearch] =
    await Promise.all([
      generateEmbedding(textBase),
      generateEmbedding(textVerySimilar),
      generateEmbedding(textRelatedTerms),
      generateEmbedding(textUnrelated),
      generateEmbedding(textSameSkills),
      generateEmbedding(textSameResearch)
    ]);

  console.log('✓ All 6 test embeddings generated (384 dimensions each).\n');

  // Test 1: Very similar profiles
  console.log('--- TEST 1: Very Similar Profiles ---');
  const res1 = calculateMatchScore(profileBase, profileVerySimilar, {
    exactDistanceMeters: 100,
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embVerySimilar
  });
  console.log(`Result: Final Match = ${res1.matchScore}%, Semantic = ${res1.semanticScore}%, Skills = ${res1.skillScore}%, Research = ${res1.researchScore}%, Location = ${res1.locationScore}%`);
  console.log(`Match Reasons: ${res1.matchReasons.join(', ')}`);
  console.log(`Explanation: ${res1.matchExplanation}`);
  if (res1.matchScore < 85 || res1.semanticScore < 85) throw new Error('Test 1 failed: Expected high match and semantic score.');
  console.log('✓ Test 1 Passed.\n');

  // Test 2: Related but different terminology
  console.log('--- TEST 2: Related but Different Terminology ---');
  const res2 = calculateMatchScore(profileBase, profileRelatedTerms, {
    exactDistanceMeters: 200,
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embRelatedTerms
  });
  console.log(`Result: Final Match = ${res2.matchScore}%, Semantic = ${res2.semanticScore}%, Skills = ${res2.skillScore}%, Research = ${res2.researchScore}%, Location = ${res2.locationScore}%`);
  console.log(`Match Reasons: ${res2.matchReasons.length > 0 ? res2.matchReasons.join(', ') : 'None (Zero exact keyword overlap)'}`);
  console.log(`Explanation: ${res2.matchExplanation}`);
  if (res2.semanticScore < 60) throw new Error('Test 2 failed: Expected strong semantic similarity despite different terms.');
  console.log('✓ Test 2 Passed (Meaningful semantic match despite different keywords).\n');

  // Test 3: Completely unrelated profiles
  console.log('--- TEST 3: Completely Unrelated Profiles ---');
  const res3 = calculateMatchScore(profileBase, profileUnrelated, {
    exactDistanceMeters: 200,
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embUnrelated
  });
  console.log(`Result: Final Match = ${res3.matchScore}%, Semantic = ${res3.semanticScore}%, Skills = ${res3.skillScore}%, Research = ${res3.researchScore}%, Location = ${res3.locationScore}%`);
  console.log(`Explanation: ${res3.matchExplanation}`);
  if (res3.semanticScore > 40 || res3.matchScore > 45) throw new Error('Test 3 failed: Expected low similarity for unrelated profiles.');
  console.log('✓ Test 3 Passed (Proper low similarity for unrelated fields).\n');

  // Test 4: Same skills but different research areas
  console.log('--- TEST 4: Same Skills but Different Research Areas ---');
  const res4 = calculateMatchScore(profileBase, profileSameSkillsDiffResearch, {
    exactDistanceMeters: 200,
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embSameSkills
  });
  console.log(`Result: Final Match = ${res4.matchScore}%, Semantic = ${res4.semanticScore}%, Skills = ${res4.skillScore}%, Research = ${res4.researchScore}%`);
  if (res4.skillScore <= res4.researchScore) throw new Error('Test 4 failed: Skill score should be higher than research score.');
  console.log('✓ Test 4 Passed.\n');

  // Test 5: Same research areas but different skills
  console.log('--- TEST 5: Same Research Areas but Different Skills ---');
  const res5 = calculateMatchScore(profileBase, profileSameResearchDiffSkills, {
    exactDistanceMeters: 200,
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embSameResearch
  });
  console.log(`Result: Final Match = ${res5.matchScore}%, Semantic = ${res5.semanticScore}%, Skills = ${res5.skillScore}%, Research = ${res5.researchScore}%`);
  if (res5.researchScore <= res5.skillScore) throw new Error('Test 5 failed: Research score should be higher than skill score.');
  console.log('✓ Test 5 Passed.\n');

  // Test 6: Nearby but unrelated user
  console.log('--- TEST 6: Nearby but Unrelated User ---');
  const res6 = calculateMatchScore(profileBase, profileUnrelated, {
    exactDistanceMeters: 20, // Very close (20 meters)
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embUnrelated
  });
  console.log(`Result: Final Match = ${res6.matchScore}%, Semantic = ${res6.semanticScore}%, Location = ${res6.locationScore}%`);
  if (res6.locationScore !== 100) throw new Error('Test 6 failed: Location score should be 100% for 20m.');
  if (res6.matchScore > 45) throw new Error('Test 6 failed: Overall match must still be low despite high proximity.');
  console.log('✓ Test 6 Passed (Proximity does not artificially inflate unrelated user).\n');

  // Test 7: Highly relevant user who is farther away
  console.log('--- TEST 7: Highly Relevant User Farther Away ---');
  const res7 = calculateMatchScore(profileBase, profileVerySimilar, {
    exactDistanceMeters: 950, // Far (950 meters out of 1000m)
    radiusMeters: 1000,
    vecA: embBase,
    vecB: embVerySimilar
  });
  console.log(`Result: Final Match = ${res7.matchScore}%, Semantic = ${res7.semanticScore}%, Location = ${res7.locationScore}%`);
  if (res7.locationScore >= 20) throw new Error('Test 7 failed: Location score should be low for 950m.');
  if (res7.matchScore < 75) throw new Error('Test 7 failed: Match should remain strong due to high semantic & skill overlap.');
  console.log('✓ Test 7 Passed.\n');

  // Test 8: Missing embedding (Graceful Fallback)
  console.log('--- TEST 8: Missing Embedding (Graceful Fallback) ---');
  const res8 = calculateMatchScore(profileBase, profileVerySimilar, {
    exactDistanceMeters: 100,
    radiusMeters: 1000,
    vecA: null, // No embedding
    vecB: null
  });
  console.log(`Result: Final Match = ${res8.matchScore}%, Semantic Fallback = ${res8.semanticScore}%, isAiSemantic = ${res8.matchDetails.isAiSemantic}`);
  if (res8.matchDetails.isAiSemantic !== false || res8.matchScore === 0) {
    throw new Error('Test 8 failed: Expected graceful fallback score without crashing.');
  }
  console.log('✓ Test 8 Passed (Gracefully computed fallback match score).\n');

  // Test 9: AI service unavailable
  console.log('--- TEST 9: AI Service Unavailable Simulation ---');
  const res9 = calculateMatchScore(profileBase, profileUnrelated, {
    exactDistanceMeters: 500,
    radiusMeters: 1000,
    vecA: undefined,
    vecB: undefined
  });
  console.log(`Result: Final Match = ${res9.matchScore}%, isAiSemantic = ${res9.matchDetails.isAiSemantic}`);
  if (res9.matchScore === undefined || isNaN(res9.matchScore)) {
    throw new Error('Test 9 failed: Returned NaN or undefined.');
  }
  console.log('✓ Test 9 Passed (Handled missing AI service without error).\n');

  console.log('===============================================================');
  console.log('🎉 ALL 9 TEST SCENARIOS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err.message);
  process.exit(1);
});
