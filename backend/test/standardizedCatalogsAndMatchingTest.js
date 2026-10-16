const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/User');
const CatalogItem = require('../models/CatalogItem');
const CustomSuggestion = require('../models/CustomSuggestion');
const {
  resolveToCanonical,
  normalizeList,
  searchCatalog,
  suggestCustomItem,
  getAllCatalogs
} = require('../services/catalogService');
const {
  calculateMatchScore,
  calculateSkillScore,
  calculateResearchScore,
  findCanonicalOverlap
} = require('../services/matchService');

const API_BASE = 'http://127.0.0.1:5001/api';

function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      url,
      { method, headers, timeout: 15000 },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = { raw };
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout on ${method} ${endpoint}`));
    });

    if (data) req.write(data);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runStandardizedCatalogsAndMatchingTest() {
  console.log('======================================================================');
  console.log('🧪 TESTING STANDARDIZED CATALOGS, ALIAS RESOLUTION & AI MATCHING');
  console.log('======================================================================\n');

  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // -------------------------------------------------------------------------
  // 1. CATALOG INTEGRITY & SEEDING TESTS
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: CATALOG INTEGRITY & SERVICE ISOLATION ---');
  const fullCatalogs = getAllCatalogs();
  assert(Array.isArray(fullCatalogs.skills) && fullCatalogs.skills.length >= 25, 'Technical skills catalog is populated');
  assert(Array.isArray(fullCatalogs.interests) && fullCatalogs.interests.length >= 15, 'Research interests catalog is populated');
  assert(Array.isArray(fullCatalogs.domains) && fullCatalogs.domains.length >= 10, 'Research domains catalog is populated');

  // Verify type isolation (skills != interests != domains)
  const pythonSkill = resolveToCanonical('skill', 'python');
  assert(pythonSkill && pythonSkill.name === 'Python' && pythonSkill.type === 'skill', 'Python resolves as skill');

  const pythonInterest = resolveToCanonical('interest', 'python');
  assert(!pythonInterest, 'Python is not in research interests catalog (catalog isolation holds)');

  const aiDomain = resolveToCanonical('domain', 'ai');
  assert(aiDomain && aiDomain.name === 'Artificial Intelligence' && aiDomain.type === 'domain', 'AI resolves to Artificial Intelligence domain');
  console.log('✅ Catalog integrity & separation between skills, interests, and domains passed\n');

  // -------------------------------------------------------------------------
  // 2. ALIAS RESOLUTION & DEDUPLICATION TESTS
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: CANONICAL ALIAS RESOLUTION & DEDUPLICATION ---');
  const testCases = [
    { type: 'skill', input: 'py', expected: 'Python' },
    { type: 'skill', input: 'js', expected: 'JavaScript' },
    { type: 'skill', input: 'ts', expected: 'TypeScript' },
    { type: 'skill', input: 'rn', expected: 'React Native' },
    { type: 'skill', input: 'k8s', expected: 'Kubernetes' },
    { type: 'skill', input: 'postgres', expected: 'PostgreSQL' },
    { type: 'interest', input: 'ml', expected: 'Machine Learning' },
    { type: 'interest', input: 'machine-learning', expected: 'Machine Learning' },
    { type: 'interest', input: 'nlp', expected: 'Natural Language Processing' },
    { type: 'interest', input: 'dl', expected: 'Deep Learning' },
    { type: 'interest', input: 'cv', expected: 'Computer Vision' },
    { type: 'interest', input: 'gnn', expected: 'Graph Neural Networks' },
    { type: 'domain', input: 'healthcare', expected: 'Healthcare & Medicine' },
    { type: 'domain', input: 'clean energy', expected: 'Renewable Energy & CleanTech' }
  ];

  for (const tc of testCases) {
    const canonical = resolveToCanonical(tc.type, tc.input);
    assert(canonical && canonical.name === tc.expected, `Alias "${tc.input}" for ${tc.type} must resolve to "${tc.expected}", got "${canonical?.name}"`);
  }

  // Deduplication check: Multiple aliases referring to the SAME canonical skill must reduce to 1 entry
  const duplicateAliases = ['ML', 'machine learning', 'machine-learning', 'statistical machine learning'];
  const deduplicated = normalizeList('interest', duplicateAliases, { namesOnly: true });
  assert(deduplicated.length === 1 && deduplicated[0] === 'Machine Learning', `Multiple ML aliases must deduplicate to single entry, got: ${JSON.stringify(deduplicated)}`);

  // Multiple mixed skills with aliases and duplicates
  const mixedSkills = ['py', 'Python', 'python3', 'JS', 'JavaScript', 'k8s', 'Docker', 'React Native', 'rn'];
  const normalizedMixed = normalizeList('skill', mixedSkills, { namesOnly: true });
  assert(normalizedMixed.length === 5, `Expected 5 unique canonical skills, got ${normalizedMixed.length}: ${JSON.stringify(normalizedMixed)}`);
  assert(normalizedMixed.includes('Python') && normalizedMixed.includes('JavaScript') && normalizedMixed.includes('Kubernetes') && normalizedMixed.includes('Docker') && normalizedMixed.includes('React Native'), 'All canonical skills present');

  // Related skills remain distinct: Machine Learning and Deep Learning must NOT merge
  const relatedInterests = ['Machine Learning', 'Deep Learning'];
  const normRelated = normalizeList('interest', relatedInterests, { namesOnly: true });
  assert(normRelated.length === 2, 'Related skills Machine Learning and Deep Learning must stay distinct');
  console.log('✅ Canonical alias resolution and deduplication passed\n');

  // -------------------------------------------------------------------------
  // 3. API ENDPOINT /api/catalog & /api/catalog/resolve
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: CATALOG REST API ENDPOINTS ---');
  const searchRes = await apiRequest('/catalog?type=skill&q=py');
  assert(searchRes.status === 200 && searchRes.body.success, 'GET /api/catalog?type=skill&q=py returns 200');
  assert(searchRes.body.items.some((i) => i.name === 'Python'), 'Search results contain Python');

  const resolveRes = await apiRequest('/catalog/resolve', 'POST', {
    type: 'interest',
    items: ['nlp', 'Natural Language Processing', 'cv', 'Computer Vision']
  });
  assert(resolveRes.status === 200 && resolveRes.body.success, 'POST /api/catalog/resolve returns 200');
  assert(resolveRes.body.canonicalNames.length === 2, 'Deduplicates nlp and cv aliases into 2 canonical names');
  assert(resolveRes.body.canonicalNames.includes('Natural Language Processing') && resolveRes.body.canonicalNames.includes('Computer Vision'), 'Resolved canonical names correct');
  console.log('✅ Catalog REST endpoints passed\n');

  // -------------------------------------------------------------------------
  // 4. CUSTOM SUGGESTION WORKFLOW
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: CUSTOM SUGGESTION WORKFLOW ---');
  // First, verify that suggesting an existing alias recognized item returns alreadyExists: true
  const existingSuggest = await suggestCustomItem('skill', { name: 'k8s', category: 'Databases & Infrastructure' }, null);
  assert(existingSuggest.alreadyExists === true && existingSuggest.canonicalName === 'Kubernetes', 'Suggesting alias k8s returns alreadyExists: true mapping to Kubernetes');

  // Next, suggest a genuinely custom unmapped skill
  const customSkillName = `QuantumML-Toolkit-${Date.now()}`;
  const newSuggest = await suggestCustomItem('skill', {
    name: customSkillName,
    category: 'Quantum Computing',
    description: 'Quantum machine learning library for hybrid classical-quantum circuits'
  }, null);
  assert(newSuggest.alreadyExists === false, 'Genuinely new skill returns alreadyExists: false');
  assert(newSuggest.suggestion && newSuggest.suggestion.status === 'pending', 'New suggestion saved with pending status');

  const savedSuggestion = await CustomSuggestion.findOne({ normalizedName: customSkillName.toLowerCase().replace(/[-_.]+/g, ' ') });
  assert(savedSuggestion !== null, 'Custom suggestion safely persisted in MongoDB');
  console.log('✅ Controlled custom suggestion workflow passed\n');

  // -------------------------------------------------------------------------
  // 5. AI MATCHING SCORE CONSISTENCY (NO SCORE INFLATION VIA ALIASES)
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: AI MATCHING SCORE CONSISTENCY & NO ALIAS INFLATION ---');
  const projectSkillsCanonical = ['Python', 'PyTorch', 'Docker'];
  const candidateCanonicalSkills = ['Python', 'PyTorch'];
  const candidateAliasSkills = ['py', 'torch'];
  const candidateInflatedAliasSkills = ['py', 'python', 'python3', 'cpython', 'torch', 'pytorch', 'torchvision'];

  // Test canonical overlap resolution
  const overlapCanonical = findCanonicalOverlap('skill', candidateCanonicalSkills, projectSkillsCanonical);
  const overlapAlias = findCanonicalOverlap('skill', candidateAliasSkills, projectSkillsCanonical);
  const overlapInflated = findCanonicalOverlap('skill', candidateInflatedAliasSkills, projectSkillsCanonical);

  console.log(`- Canonical Skills Overlap: ${JSON.stringify(overlapCanonical.commonCanonical)} (count: ${overlapCanonical.count})`);
  console.log(`- Single Alias Skills Overlap: ${JSON.stringify(overlapAlias.commonCanonical)} (count: ${overlapAlias.count})`);
  console.log(`- Multi-Alias Inflated Skills Overlap: ${JSON.stringify(overlapInflated.commonCanonical)} (count: ${overlapInflated.count})`);

  assert(overlapCanonical.count === 2 && overlapCanonical.commonCanonical.includes('Python') && overlapCanonical.commonCanonical.includes('PyTorch'), 'Canonical overlap matches 2 items');
  assert(overlapAlias.count === 2 && overlapAlias.commonCanonical.includes('Python') && overlapAlias.commonCanonical.includes('PyTorch'), 'Alias overlap resolves to same 2 canonical items');
  assert(overlapInflated.count === 2, 'Candidate with multiple aliases for same skills resolves to exactly 2 matches (no score inflation)');

  // Calculate skill scores
  const userProject = { skills: projectSkillsCanonical, role: 'Software Engineer' };
  const userCanonical = { skills: candidateCanonicalSkills, role: 'Software Engineer' };
  const userAlias = { skills: candidateAliasSkills, role: 'Software Engineer' };
  const userInflated = { skills: candidateInflatedAliasSkills, role: 'Software Engineer' };

  const scoreCanonical = calculateSkillScore(userCanonical, userProject, overlapCanonical.commonCanonical);
  const scoreAlias = calculateSkillScore(userAlias, userProject, overlapAlias.commonCanonical);
  const scoreInflated = calculateSkillScore(userInflated, userProject, overlapInflated.commonCanonical);

  console.log(`- Canonical Skills Score: ${scoreCanonical}`);
  console.log(`- Single Alias Skills Score: ${scoreAlias}`);
  console.log(`- Multi-Alias Inflated Skills Score: ${scoreInflated}`);

  assert(scoreCanonical === scoreAlias, `Alias score (${scoreAlias}) must equal canonical score (${scoreCanonical})`);
  assert(scoreCanonical === scoreInflated, `Duplicate aliases (${scoreInflated}) must NOT inflate score over canonical (${scoreCanonical})`);

  // Test Research Overlap Consistency
  const projectInterests = ['Machine Learning', 'Computer Vision'];
  const candidateCanonicalInterests = ['Machine Learning'];
  const candidateAliasInterests = ['ML', 'machine-learning'];

  const overlapResCanonical = findCanonicalOverlap('interest', candidateCanonicalInterests, projectInterests);
  const overlapResAlias = findCanonicalOverlap('interest', candidateAliasInterests, projectInterests);

  assert(overlapResCanonical.count === 1 && overlapResCanonical.commonCanonical[0] === 'Machine Learning', 'Canonical research overlap correct');
  assert(overlapResAlias.count === 1 && overlapResAlias.commonCanonical[0] === 'Machine Learning', 'Alias research overlap resolved to single canonical name');

  const researchCanonical = calculateResearchScore(
    { researchInterests: candidateCanonicalInterests },
    { researchInterests: projectInterests },
    overlapResCanonical.commonCanonical
  );
  const researchAlias = calculateResearchScore(
    { researchInterests: candidateAliasInterests },
    { researchInterests: projectInterests },
    overlapResAlias.commonCanonical
  );

  assert(researchCanonical === researchAlias, 'Alias research score equals canonical research score');
  console.log('✅ AI matching consistency and anti-score-inflation verified\n');

  // -------------------------------------------------------------------------
  // 6. END-TO-END USER REGISTRATION & PROFILE CANONICAL NORMALIZATION
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: REGISTRATION & PROFILE NORMALIZATION TO CANONICAL NAMES ---');
  const testEmail = `catalog_test_${Date.now()}@geoconnect.org`;
  const regPayload = {
    name: 'Standardized Catalog Tester',
    email: testEmail,
    password: 'password123',
    role: 'AI Researcher',
    organization: 'GeoConnect Standards Lab',
    skills: ['py', 'rn', 'postgres', 'docker'],
    researchInterests: ['nlp', 'cv', 'gnn']
  };

  const regRes = await apiRequest('/auth/register', 'POST', regPayload);
  assert(regRes.status === 201 && regRes.body.success, 'Registration with raw aliases succeeds');
  const token = regRes.body.token;

  // Verify registered user in database has normalized canonical display names
  const createdUser = await User.findOne({ email: testEmail });
  assert(createdUser.skills.includes('Python') && createdUser.skills.includes('React Native') && createdUser.skills.includes('PostgreSQL') && createdUser.skills.includes('Docker'), 'User skills normalized to canonical names on registration');
  assert(createdUser.researchInterests.includes('Natural Language Processing') && createdUser.researchInterests.includes('Computer Vision') && createdUser.researchInterests.includes('Graph Neural Networks'), 'User research interests normalized to canonical names on registration');

  // Update profile with domain aliases and project skills
  const updatePayload = {
    researchDomains: ['ai', 'healthcare'],
    projects: [
      {
        title: 'Clinical Vision System',
        domain: 'healthcare',
        techStack: ['py', 'torch', 'opencv'],
        description: 'Multi-modal diagnostics'
      }
    ]
  };

  const updateRes = await apiRequest('/users/profile', 'PUT', updatePayload, token);
  assert(updateRes.status === 200 && updateRes.body.success, 'Profile update succeeds');

  const updatedUser = await User.findOne({ email: testEmail });
  assert(updatedUser.researchDomains.includes('Artificial Intelligence') && updatedUser.researchDomains.includes('Healthcare & Medicine'), 'Research domains normalized to canonical names on update');
  assert(updatedUser.projects[0].techStack.includes('Python') && updatedUser.projects[0].techStack.includes('PyTorch') && updatedUser.projects[0].techStack.includes('OpenCV'), 'Project tech stack normalized to canonical names');
  console.log('✅ Registration and Profile CRUD normalization passed\n');

  // -------------------------------------------------------------------------
  // 7. TEAM BUILDER AI RECOMMENDATION INTEGRATION
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: TEAM BUILDER MATCHING VIA CANONICAL CATALOGS ---');
  const recommendPayload = {
    title: 'Autonomous Medical Imaging Team',
    description: 'Developing high precision vision algorithms for clinical diagnosis',
    requiredSkills: ['Python', 'PyTorch'],
    researchDomain: 'Healthcare & Medicine'
  };

  const recRes = await apiRequest('/team/recommend', 'POST', recommendPayload, token);
  assert(recRes.status === 200 && recRes.body.success, 'POST /team/recommend returns 200');
  assert(Array.isArray(recRes.body.recommendations), 'Returns recommendations list');

  // Cleanup test user
  await User.deleteOne({ email: testEmail });
  await CustomSuggestion.deleteOne({ name: customSkillName });

  console.log('======================================================================');
  console.log('🎉 ALL STANDARDIZED CATALOG & MATCHING TESTS PASSED PERFECTLY!');
  console.log('======================================================================\n');
}

if (require.main === module) {
  runStandardizedCatalogsAndMatchingTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

module.exports = runStandardizedCatalogsAndMatchingTest;
