const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/User');

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

async function runProfileAndRegistrationEnhancementsTest() {
  console.log('======================================================================');
  console.log('🧪 TESTING PROFILE IMPROVEMENTS & REGISTRATION ENHANCEMENTS');
  console.log('======================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const ts = Date.now();
  const minimalUserEmail = `minimal_user_${ts}@test.com`;
  const customAvatarUserEmail = `avatar_user_${ts}@test.com`;
  const password = 'Password123!';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Registration with ONLY essential fields (name, email, password)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Registration with Minimal Essential Fields ---');
    const regMinimalRes = await apiRequest('/auth/register', 'POST', {
      name: 'Dr. Minimal Researcher',
      email: minimalUserEmail,
      password: password
    });

    assert(regMinimalRes.status === 201, `Expected status 201 on minimal registration, got ${regMinimalRes.status}`);
    assert(regMinimalRes.body.success === true, 'Expected success: true on minimal registration');
    assert(Boolean(regMinimalRes.body.token), 'Expected token returned on minimal registration');
    assert(regMinimalRes.body.user.role === 'Researcher', `Expected default role 'Researcher', got '${regMinimalRes.body.user.role}'`);
    assert(regMinimalRes.body.user.organization === 'Independent Researcher', `Expected default org 'Independent Researcher', got '${regMinimalRes.body.user.organization}'`);
    assert(regMinimalRes.body.user.avatarId === 'avatar-1', `Expected default avatarId 'avatar-1', got '${regMinimalRes.body.user.avatarId}'`);
    console.log('✓ Registration succeeded with ONLY essential fields (name, email, password).');
    console.log('✓ Sensible defaults applied for role, organization, and avatarId.');

    const token = regMinimalRes.body.token;

    // -------------------------------------------------------------------------
    // TEST 2: Registration with Selected Avatar (avatar-2)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Registration with Selected Avatar (avatar-2) ---');
    const avatarImgUri = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300';
    const regAvatarRes = await apiRequest('/auth/register', 'POST', {
      name: 'Sage Fellow',
      email: customAvatarUserEmail,
      password: password,
      avatarId: 'avatar-2',
      profileImage: avatarImgUri
    });

    assert(regAvatarRes.status === 201, `Expected status 201, got ${regAvatarRes.status}`);
    assert(regAvatarRes.body.user.avatarId === 'avatar-2', `Expected avatarId 'avatar-2', got '${regAvatarRes.body.user.avatarId}'`);
    assert(regAvatarRes.body.user.profileImage === avatarImgUri, 'Expected selected profileImage persisted');
    console.log('✓ Registration with avatar selection persisted avatarId: "avatar-2" successfully.');

    // -------------------------------------------------------------------------
    // TEST 3: Update Profile with Avatar Change (avatar-3)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Update Profile with Avatar Change ---');
    const forestImgUri = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300';
    const updateAvatarRes = await apiRequest('/users/profile', 'PUT', {
      avatarId: 'avatar-3',
      profileImage: forestImgUri
    }, token);

    assert(updateAvatarRes.status === 200, `Expected status 200, got ${updateAvatarRes.status}`);
    assert(updateAvatarRes.body.user.avatarId === 'avatar-3', `Expected avatarId 'avatar-3', got '${updateAvatarRes.body.user.avatarId}'`);
    assert(updateAvatarRes.body.user.profileImage === forestImgUri, 'Expected updated profileImage persisted');
    console.log('✓ Profile updated successfully to avatarId: "avatar-3".');

    // -------------------------------------------------------------------------
    // TEST 4: Multiple Research Topics CRUD & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Multiple Research Topics CRUD ---');

    // 4a. Add Topic 1
    const addTopic1Res = await apiRequest('/users/research', 'POST', {
      title: 'Graph Neural Networks for Drug Discovery',
      domain: 'Biomedical AI',
      description: 'Modeling molecular graphs and protein-ligand interactions.',
      skills: ['PyTorch Geometric', 'RDKit', 'Graph Transformers']
    }, token);

    assert(addTopic1Res.status === 201, `Expected status 201, got ${addTopic1Res.status}`);
    assert(Array.isArray(addTopic1Res.body.researchTopics), 'Expected researchTopics array returned');
    assert(addTopic1Res.body.researchTopics.length === 1, `Expected 1 research topic, got ${addTopic1Res.body.researchTopics.length}`);
    const topic1 = addTopic1Res.body.researchTopic;
    assert(topic1.title === 'Graph Neural Networks for Drug Discovery', 'Expected correct title for topic 1');
    console.log('✓ Added research topic 1 successfully.');

    // 4b. Add Topic 2
    const addTopic2Res = await apiRequest('/users/research', 'POST', {
      title: 'Spatial Representation Learning',
      domain: 'Geographic Data Science',
      description: 'Self-supervised embeddings on remote sensing and point cloud data.',
      skills: ['GeoPandas', 'Rasterio', 'GDAL']
    }, token);

    assert(addTopic2Res.status === 201, `Expected status 201, got ${addTopic2Res.status}`);
    assert(addTopic2Res.body.researchTopics.length === 2, `Expected 2 research topics, got ${addTopic2Res.body.researchTopics.length}`);
    const topic2 = addTopic2Res.body.researchTopic;
    console.log('✓ Added research topic 2 successfully. Multiple research topics confirmed.');

    // 4c. Duplicate topic title prevention (case-insensitive)
    const dupTopicRes = await apiRequest('/users/research', 'POST', {
      title: 'graph neural networks for drug discovery',
      domain: 'Other Domain'
    }, token);

    assert(dupTopicRes.status === 400, `Expected status 400 on duplicate title, got ${dupTopicRes.status}`);
    console.log('✓ Blocked duplicate research topic title with status 400.');

    // 4d. Update Topic 1
    const updateTopicRes = await apiRequest(`/users/research/${topic1._id}`, 'PUT', {
      title: 'Graph Neural Networks for Structure-Based Drug Discovery',
      skills: ['PyTorch Geometric', 'RDKit', 'DeepChem']
    }, token);

    assert(updateTopicRes.status === 200, `Expected status 200, got ${updateTopicRes.status}`);
    assert(updateTopicRes.body.researchTopic.title === 'Graph Neural Networks for Structure-Based Drug Discovery', 'Expected updated title');
    console.log('✓ Updated research topic 1 successfully.');

    // 4e. Delete Topic 2
    const deleteTopicRes = await apiRequest(`/users/research/${topic2._id}`, 'DELETE', null, token);
    assert(deleteTopicRes.status === 200, `Expected status 200, got ${deleteTopicRes.status}`);
    assert(deleteTopicRes.body.researchTopics.length === 1, 'Expected 1 topic left after deletion');
    console.log('✓ Deleted research topic 2 successfully.');

    // -------------------------------------------------------------------------
    // TEST 5: Multiple Projects CRUD & Validations
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Multiple Projects CRUD & URL Validation ---');

    // 5a. Add Project 1
    const addProj1Res = await apiRequest('/users/projects', 'POST', {
      title: 'GeoConnect Spatial Matching Engine',
      status: 'In Progress',
      domain: 'Geospatial AI',
      description: 'High-performance real-time geospatial proximity and semantic embedding service.',
      techStack: ['Node.js', 'Express', 'MongoDB', 'Socket.io'],
      link: 'https://github.com/geoconnect/spatial-engine'
    }, token);

    assert(addProj1Res.status === 201, `Expected status 201, got ${addProj1Res.status}`);
    assert(Array.isArray(addProj1Res.body.projects), 'Expected projects array returned');
    assert(addProj1Res.body.projects.length === 1, `Expected 1 project, got ${addProj1Res.body.projects.length}`);
    const proj1 = addProj1Res.body.project;
    assert(proj1.status === 'In Progress', 'Expected status "In Progress"');
    console.log('✓ Added project 1 with status and domain successfully.');

    // 5b. Add Project 2
    const addProj2Res = await apiRequest('/users/projects', 'POST', {
      title: 'BioGraph Visualizer',
      status: 'Completed',
      domain: 'Bioinformatics',
      description: 'Interactive Mol* 3D biomolecular viewer integrated with AlphaFold embeddings.',
      techStack: ['React Native', 'Mol*', 'KaTeX'],
      link: 'https://biograph.app'
    }, token);

    assert(addProj2Res.status === 201, `Expected status 201, got ${addProj2Res.status}`);
    assert(addProj2Res.body.projects.length === 2, `Expected 2 projects, got ${addProj2Res.body.projects.length}`);
    const proj2 = addProj2Res.body.project;
    console.log('✓ Added project 2 successfully. Multiple projects confirmed.');

    // 5c. Prevent duplicate project title
    const dupProjRes = await apiRequest('/users/projects', 'POST', {
      title: 'geoconnect spatial matching engine'
    }, token);

    assert(dupProjRes.status === 400, `Expected status 400 on duplicate project, got ${dupProjRes.status}`);
    console.log('✓ Blocked duplicate project title with status 400.');

    // 5d. Validate optional URL format when provided
    const invalidUrlRes = await apiRequest('/users/projects', 'POST', {
      title: 'Invalid URL Project',
      link: 'invalid-url-with-no-domain'
    }, token);

    assert(invalidUrlRes.status === 400, `Expected status 400 on invalid URL, got ${invalidUrlRes.status}`);
    console.log('✓ Validated project URL format, correctly rejecting invalid URL format.');

    // 5e. Update Project 1 Status to Completed
    const updateProjRes = await apiRequest(`/users/projects/${proj1._id}`, 'PUT', {
      status: 'Completed'
    }, token);

    assert(updateProjRes.status === 200, `Expected status 200, got ${updateProjRes.status}`);
    assert(updateProjRes.body.project.status === 'Completed', 'Expected project status updated to Completed');
    console.log('✓ Updated project 1 status to "Completed" successfully.');

    // 5f. Delete Project 2
    const deleteProjRes = await apiRequest(`/users/projects/${proj2._id}`, 'DELETE', null, token);
    assert(deleteProjRes.status === 200, `Expected status 200, got ${deleteProjRes.status}`);
    assert(deleteProjRes.body.projects.length === 1, 'Expected 1 project remaining after deletion');
    console.log('✓ Deleted project 2 successfully.');

    // -------------------------------------------------------------------------
    // TEST 6: Persistence on Re-Login
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Persistence on Re-Login ---');
    const loginRes = await apiRequest('/auth/login', 'POST', {
      email: minimalUserEmail,
      password: password
    });

    assert(loginRes.status === 200, `Expected status 200 on login, got ${loginRes.status}`);
    assert(loginRes.body.user.avatarId === 'avatar-3', `Expected avatarId 'avatar-3' preserved, got '${loginRes.body.user.avatarId}'`);
    assert(loginRes.body.user.researchTopics.length === 1, `Expected 1 researchTopic preserved, got ${loginRes.body.user.researchTopics.length}`);
    assert(loginRes.body.user.projects.length === 1, `Expected 1 project preserved, got ${loginRes.body.user.projects.length}`);
    assert(loginRes.body.user.projects[0].status === 'Completed', `Expected project status 'Completed' preserved`);
    console.log('✓ Re-login verified complete persistence of avatarId, researchTopics, and projects.');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    await User.deleteMany({ email: { $in: [minimalUserEmail, customAvatarUserEmail] } });
    console.log('\n✓ Cleaned up test database documents.');

    console.log('\n======================================================================');
    console.log('🎉 ALL PROFILE IMPROVEMENTS & REGISTRATION ENHANCEMENT TESTS PASSED!');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    await User.deleteMany({ email: { $in: [minimalUserEmail, customAvatarUserEmail] } });
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runProfileAndRegistrationEnhancementsTest();
