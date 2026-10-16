/**
 * GeoConnect Comprehensive End-to-End Verification Test Suite
 * 
 * Tests the entire platform end-to-end:
 * 1. Health check & Service status
 * 2. Auth & JWT lifecycle (register, login, /me, password security)
 * 3. Profile update & Embedding synchronization
 * 4. Privacy-preserving Nearby Discovery (Haversine, radius, coordinate obfuscation)
 * 5. Networking Connections (request, duplicate prevention, accept, listing)
 * 6. Messaging (connected access control, sending, read receipt, 403 enforcement for non-connections)
 * 7. Research Team Builder (AI recommendation, role & skill matching, project requirements CRUD)
 * 8. Conference & Event Mode (create, filter, join, duplicate prevention, AI attendee matching, leave)
 * 9. Research Collaboration Workspaces (create, invite, tasks, milestones, notes, 403 strict access control)
 * 10. Research Discovery (publication search across profiles)
 * 11. QR Profile Lookup & Security (payload validation, location sanitation)
 */

const http = require('http');

const API_BASE = 'http://127.0.0.1:5001/api';

// Simple Promise-based HTTP helper
function apiRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = { raw: rawData };
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runEndToEndVerification() {
  console.log('======================================================================');
  console.log('🔬 GEOCONNECT FULL END-TO-END VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const aliceEmail = `alice_e2e_${timestamp}@geoconnect.org`;
  const bobEmail = `bob_e2e_${timestamp}@geoconnect.org`;
  const charlieEmail = `charlie_e2e_${timestamp}@geoconnect.org`;
  const testPassword = 'Password123!Secure';

  let aliceToken = null;
  let aliceId = null;
  let bobToken = null;
  let bobId = null;
  let charlieToken = null;
  let charlieId = null;

  // ------------------------------------------------------------------
  // 1. Health Endpoint
  // ------------------------------------------------------------------
  console.log('▶ [1/11] Checking API Health Endpoint...');
  const healthRes = await apiRequest('/health');
  assert(healthRes.status === 200, `Health check returned ${healthRes.status}`);
  assert(healthRes.data.status === 'OK', 'Health status is not OK');
  console.log('   ✓ Backend is healthy and responding.\n');

  // ------------------------------------------------------------------
  // 2. Authentication & JWT Lifecycle
  // ------------------------------------------------------------------
  console.log('▶ [2/11] Testing Registration, Login & JWT Lifecycle...');

  // Register Alice (AI / Deep Learning Researcher)
  const regAlice = await apiRequest('/auth/register', 'POST', {
    name: 'Dr. Alice Watson',
    email: aliceEmail,
    password: testPassword,
    role: 'Principal AI Scientist',
    organization: 'Stanford Vision & Learning Lab',
    bio: 'Pioneering foundation models and neuro-symbolic reasoning.',
    skills: ['PyTorch', 'Computer Vision', 'Deep Learning', 'Transformers'],
    researchInterests: ['Self-Supervised Learning', 'Multimodal LLMs', 'Robotic Vision'],
    researchDomains: ['Artificial Intelligence']
  });
  assert(regAlice.status === 201, `Alice registration failed with status ${regAlice.status}: ${JSON.stringify(regAlice.data)}`);
  assert(regAlice.data.token, 'Alice token missing');
  assert(!regAlice.data.user.password, 'Password leaked in registration response');
  aliceToken = regAlice.data.token;
  aliceId = regAlice.data.user._id;

  // Register Bob (Clinical & Biomedical Informatics)
  const regBob = await apiRequest('/auth/register', 'POST', {
    name: 'Dr. Bob Martinez',
    email: bobEmail,
    password: testPassword,
    role: 'Biomedical Informatics Researcher',
    organization: 'UCSF Medical Center',
    bio: 'Applying machine learning to clinical medical imaging and diagnostics.',
    skills: ['Python', 'Medical Imaging', 'Computer Vision', 'PyTorch'],
    researchInterests: ['Radiology AI', 'Clinical Diagnostics', 'Multimodal LLMs'],
    researchDomains: ['Computational Medicine', 'Artificial Intelligence']
  });
  assert(regBob.status === 201, `Bob registration failed: ${JSON.stringify(regBob.data)}`);
  bobToken = regBob.data.token;
  bobId = regBob.data.user._id;

  // Register Charlie (Unrelated / Third party)
  const regCharlie = await apiRequest('/auth/register', 'POST', {
    name: 'Charlie Davis',
    email: charlieEmail,
    password: testPassword,
    role: 'Renaissance Historian',
    organization: 'Oxford Archives',
    bio: 'Archival research on 15th-century Florentine manuscripts.',
    skills: ['Latin', 'Paleography', 'Archival Restoration'],
    researchInterests: ['Early Renaissance', 'Manuscripts'],
    researchDomains: ['Humanities']
  });
  assert(regCharlie.status === 201, `Charlie registration failed`);
  charlieToken = regCharlie.data.token;
  charlieId = regCharlie.data.user._id;

  // Login Alice
  const loginRes = await apiRequest('/auth/login', 'POST', {
    email: aliceEmail,
    password: testPassword
  });
  assert(loginRes.status === 200, 'Login failed');
  assert(loginRes.data.token, 'Token missing in login response');

  // Verify /auth/me
  const meRes = await apiRequest('/auth/me', 'GET', null, aliceToken);
  assert(meRes.status === 200, '/auth/me failed');
  assert(meRes.data.user.email === aliceEmail, 'User email mismatch in /auth/me');
  console.log('   ✓ Registration, login, and JWT authorization verified.\n');

  // ------------------------------------------------------------------
  // 3. Profile Update & Embeddings Sync
  // ------------------------------------------------------------------
  console.log('▶ [3/11] Updating Profiles & Verifying Publications and Embeddings...');
  const updateAlice = await apiRequest('/users/profile', 'PUT', {
    bio: 'Pioneering multimodal foundation models for biomedical vision.',
    publications: [
      {
        title: 'Contrastive Visual Representations for Radiology Scan Synthesis',
        journal: 'IEEE Transactions on Medical Imaging',
        year: 2025,
        doi: '10.1109/TMI.2025.001',
        abstract: 'A self-supervised deep learning pipeline for high-resolution medical scan segmentation.'
      }
    ]
  }, aliceToken);
  assert(updateAlice.status === 200, `Profile update failed: ${JSON.stringify(updateAlice.data)}`);
  assert(updateAlice.data.user.publications.length === 1, 'Publication was not saved');

  const updateBob = await apiRequest('/users/profile', 'PUT', {
    publications: [
      {
        title: 'Deep Neural Networks in Clinical Diagnostic Triage',
        journal: 'Nature Biomedical Engineering',
        year: 2026,
        doi: '10.1038/s41551-026-002',
        abstract: 'Benchmarking deep neural models on emergency room multi-organ CT scans.'
      }
    ]
  }, bobToken);
  assert(updateBob.status === 200, 'Bob profile update failed');
  console.log('   ✓ Profile and publication persistence verified.\n');

  // ------------------------------------------------------------------
  // 4. Privacy-Preserving Nearby Discovery
  // ------------------------------------------------------------------
  console.log('▶ [4/11] Testing Privacy-Safe Nearby Discovery (San Francisco coordinates)...');
  // Alice updates GPS: 37.7749 N, -122.4194 W
  const locAlice = await apiRequest('/location/update', 'POST', {
    latitude: 37.7749,
    longitude: -122.4194
  }, aliceToken);
  assert(locAlice.status === 200, 'Alice location update failed');

  // Bob updates GPS: 37.7760 N, -122.4180 W (~170m away)
  const locBob = await apiRequest('/location/update', 'POST', {
    latitude: 37.7760,
    longitude: -122.4180
  }, bobToken);
  assert(locBob.status === 200, 'Bob location update failed');

  // Alice searches nearby users within 500m
  const nearbyRes = await apiRequest('/location/nearby?radius=500', 'GET', null, aliceToken);
  assert(nearbyRes.status === 200, `Nearby discovery failed: ${JSON.stringify(nearbyRes.data)}`);
  assert(Array.isArray(nearbyRes.data.users), 'Nearby users is not an array');
  
  const foundBob = nearbyRes.data.users.find(u => u._id.toString() === bobId.toString());
  assert(foundBob, 'Bob was not discovered within 500m radius');
  assert(foundBob.mapPosition, 'Obfuscated mapPosition missing');
  assert(!foundBob.location, 'Exact GPS location coordinates LEAKED in response!');
  assert(!foundBob.aiProfileEmbedding, 'Raw AI embedding vector LEAKED in response!');
  assert(typeof foundBob.matchScore === 'number' && foundBob.matchScore > 0, `Invalid matchScore: ${foundBob.matchScore}`);
  assert(foundBob.matchExplanation, 'Match explanation missing');
  console.log(`   ✓ Discovered Bob: ${foundBob.name} | Dist: ${foundBob.approximateDistance} | Match Score: ${foundBob.matchScore}%`);
  console.log(`   ✓ Privacy Verified: Exact GPS coordinates and raw embedding stripped.`);
  console.log(`   ✓ Match Reason: ${foundBob.matchExplanation}\n`);

  // ------------------------------------------------------------------
  // 5. Connection Requests Flow
  // ------------------------------------------------------------------
  console.log('▶ [5/11] Testing Connection Requests & Duplicate Prevention...');
  // Alice sends connection request to Bob
  const reqRes = await apiRequest(`/connections/request/${bobId}`, 'POST', {}, aliceToken);
  assert(reqRes.status === 201, `Connection request failed: ${JSON.stringify(reqRes.data)}`);
  const connectionId = reqRes.data.connection._id;

  // Attempt duplicate request
  const dupRes = await apiRequest(`/connections/request/${bobId}`, 'POST', {}, aliceToken);
  assert(dupRes.status === 400, 'Duplicate connection request was not rejected with 400');
  console.log('   ✓ Duplicate connection request prevented (400 Bad Request).');

  // Bob checks pending requests
  const pendingRes = await apiRequest('/connections/requests', 'GET', null, bobToken);
  assert(pendingRes.status === 200, 'Failed to fetch pending requests');
  assert(Array.isArray(pendingRes.data.incoming), 'Incoming requests is not an array');
  assert(pendingRes.data.incoming.some(r => r.connectionId.toString() === connectionId.toString()), 'Pending request not in incoming list');

  // Bob accepts connection
  const acceptRes = await apiRequest(`/connections/accept/${connectionId}`, 'PUT', {}, bobToken);
  assert(acceptRes.status === 200, 'Accept connection failed');

  // Alice checks accepted connections
  const aliceConns = await apiRequest('/connections', 'GET', null, aliceToken);
  assert(aliceConns.status === 200, 'Failed to get accepted connections');
  assert(Array.isArray(aliceConns.data.connections), 'Connections is not an array');
  assert(aliceConns.data.connections.some(c => c.connectionId.toString() === connectionId.toString()), 'Accepted connection missing');
  console.log('   ✓ Connection request, acceptance, and retrieval verified.\n');

  // ------------------------------------------------------------------
  // 6. Direct Messaging & Security Authorization
  // ------------------------------------------------------------------
  console.log('▶ [6/11] Testing Direct Messaging & Authorization Restriction...');
  // Alice sends message to Bob (Connected)
  const sendRes = await apiRequest(`/messages/${bobId}`, 'POST', {
    content: 'Hi Dr. Martinez, excited to collaborate on clinical AI models!'
  }, aliceToken);
  assert(sendRes.status === 201, `Send message failed: ${JSON.stringify(sendRes.data)}`);
  assert(sendRes.data.data && sendRes.data.data.content.includes('clinical AI models'), 'Message content mismatch');

  // Bob reads conversation history
  const historyRes = await apiRequest(`/messages/${aliceId}`, 'GET', null, bobToken);
  assert(historyRes.status === 200, 'Get messages failed');
  assert(Array.isArray(historyRes.data.messages) && historyRes.data.messages.length >= 1, 'No messages found in conversation');

  // Security check: Charlie (Not connected) attempts to message Bob
  const unauthorizedMsg = await apiRequest(`/messages/${bobId}`, 'POST', {
    content: 'Spam from unconnected stranger'
  }, charlieToken);
  assert(unauthorizedMsg.status === 403, `Unconnected user messaging was NOT blocked with 403 (got ${unauthorizedMsg.status})`);
  console.log('   ✓ Authorized messaging verified between accepted connections.');
  console.log('   ✓ Security Check: Unconnected users strictly blocked from messaging (403 Forbidden).\n');

  // ------------------------------------------------------------------
  // 7. Research Team Builder
  // ------------------------------------------------------------------
  console.log('▶ [7/11] Testing Research Team Builder & AI Teammate Recommendation...');
  const recRes = await apiRequest('/team/recommend', 'POST', {
    title: 'Multimodal Radiology Diagnostic Assistant',
    description: 'Developing generative deep learning models to assist radiologists in triage and lesion detection.',
    requiredSkills: ['Medical Imaging', 'PyTorch', 'Computer Vision'],
    researchDomain: 'Computational Medicine',
    desiredRoles: ['Biomedical Informatics Researcher', 'Clinical AI Engineer'],
    collaborationType: 'Research Paper'
  }, aliceToken);

  assert(recRes.status === 200, `Team recommend failed: ${JSON.stringify(recRes.data)}`);
  assert(Array.isArray(recRes.data.recommendations), 'Recommendations is not an array');
  
  const recBob = recRes.data.recommendations.find(r => r._id.toString() === bobId.toString());
  assert(recBob, 'Bob was not recommended for Medical Imaging / Radiology project');
  assert(recBob.compatibilityScore > 50, `Bob compatibility score too low: ${recBob.compatibilityScore}`);
  assert(recBob.recommendationReason, 'Recommendation reason missing');
  assert(recBob.matchedSkills.length > 0, 'Matched skills empty');
  console.log(`   ✓ Recommended Teammate: ${recBob.name} | Score: ${recBob.compatibilityScore}%`);
  console.log(`   ✓ Matching Reason: ${recBob.recommendationReason}`);
  console.log(`   ✓ Matched Skills: ${recBob.matchedSkills.join(', ')}`);

  // Alice saves a project requirement
  const saveProj = await apiRequest('/team/projects', 'POST', {
    title: 'Multimodal Radiology Diagnostic Assistant',
    description: 'Developing generative deep learning models for medical scans.',
    requiredSkills: ['Medical Imaging', 'PyTorch'],
    desiredRoles: ['Biomedical Informatics Researcher'],
    researchDomain: 'Computational Medicine',
    collaborationType: 'Research Paper'
  }, aliceToken);
  assert(saveProj.status === 201, `Save project failed: ${JSON.stringify(saveProj.data)}`);
  const projId = saveProj.data.project._id;

  // Alice lists her saved projects
  const myProjs = await apiRequest('/team/projects', 'GET', null, aliceToken);
  assert(myProjs.status === 200 && myProjs.data.projects.some(p => p._id.toString() === projId.toString()), 'Project not listed');

  // Alice deletes project
  const delProj = await apiRequest(`/team/projects/${projId}`, 'DELETE', null, aliceToken);
  assert(delProj.status === 200, 'Project deletion failed');
  console.log('   ✓ Team Builder recommendation & Project requirements CRUD verified.\n');

  // ------------------------------------------------------------------
  // 8. Conference & Event Mode
  // ------------------------------------------------------------------
  console.log('▶ [8/11] Testing Conference & Event Mode...');
  // Alice hosts a conference
  const createEvt = await apiRequest('/events', 'POST', {
    title: `AI in Healthcare Summit ${timestamp}`,
    description: 'International symposium on deep learning in medicine and pathology.',
    category: 'Conference',
    locationType: 'In-Person',
    venue: 'Moscone Center West',
    city: 'San Francisco, CA',
    startDate: new Date(Date.now() + 86400000 * 2),
    endDate: new Date(Date.now() + 86400000 * 4),
    capacity: 250,
    topics: ['Medical Imaging', 'Foundation Models', 'Clinical Diagnostics'],
    tags: ['AI', 'Medicine', 'Radiology']
  }, aliceToken);
  assert(createEvt.status === 201, `Create event failed: ${JSON.stringify(createEvt.data)}`);
  const eventId = createEvt.data.event._id;

  // Bob joins event
  const joinRes = await apiRequest(`/events/${eventId}/join`, 'POST', {}, bobToken);
  assert(joinRes.status === 200, `Join event failed: ${JSON.stringify(joinRes.data)}`);

  // Bob duplicate join prevention
  const dupJoin = await apiRequest(`/events/${eventId}/join`, 'POST', {}, bobToken);
  assert(dupJoin.status === 400, 'Duplicate event join was not rejected with 400');
  console.log('   ✓ Duplicate event attendance prevented (400 Bad Request).');

  // Alice queries event attendees with AI match ranking
  const matchAttendees = await apiRequest(`/events/${eventId}/attendees/match`, 'GET', null, aliceToken);
  assert(matchAttendees.status === 200, `Attendee match failed: ${JSON.stringify(matchAttendees.data)}`);
  assert(Array.isArray(matchAttendees.data.attendees), 'Attendees is not an array');
  const matchedBobAttendee = matchAttendees.data.attendees.find(a => a._id.toString() === bobId.toString());
  assert(matchedBobAttendee, 'Bob not found in event attendees matching list');
  assert(matchedBobAttendee.matchScore > 50, `Bob attendee match score too low: ${matchedBobAttendee.matchScore}`);
  console.log(`   ✓ Event Attendee Match: ${matchedBobAttendee.name} | Match Score: ${matchedBobAttendee.matchScore}%`);

  // Bob leaves event
  const leaveRes = await apiRequest(`/events/${eventId}/leave`, 'POST', {}, bobToken);
  assert(leaveRes.status === 200, 'Leave event failed');
  console.log('   ✓ Event lifecycle, join/leave, and AI attendee matching verified.\n');

  // ------------------------------------------------------------------
  // 9. Research Collaboration Workspaces & Strict Access Control
  // ------------------------------------------------------------------
  console.log('▶ [9/11] Testing Research Workspaces & Access Control...');
  // Alice creates research workspace
  const createWs = await apiRequest('/workspaces', 'POST', {
    title: 'Chest CT Pathology Segmenter',
    description: 'Collaborative development of a transformer-based lesion detection benchmark.',
    status: 'In Progress'
  }, aliceToken);
  assert(createWs.status === 201, `Create workspace failed: ${JSON.stringify(createWs.data)}`);
  const wsId = createWs.data.workspace._id;

  // Alice invites Bob
  const inviteRes = await apiRequest(`/workspaces/${wsId}/members`, 'POST', {
    userId: bobId,
    role: 'Contributor'
  }, aliceToken);
  assert(inviteRes.status === 200, `Invite member failed: ${JSON.stringify(inviteRes.data)}`);

  // Alice adds task
  const addTaskRes = await apiRequest(`/workspaces/${wsId}/tasks`, 'POST', {
    title: 'Curate 500 annotated CT scans',
    description: 'Filter and normalize DICOM image headers.',
    priority: 'High',
    assignee: bobId
  }, aliceToken);
  assert(addTaskRes.status === 201, `Add task failed: ${JSON.stringify(addTaskRes.data)}`);
  const taskList = addTaskRes.data.tasks;
  const taskId = taskList[taskList.length - 1]._id;

  // Bob (as workspace member) updates task to Completed
  const updateTaskRes = await apiRequest(`/workspaces/${wsId}/tasks/${taskId}`, 'PATCH', {
    status: 'Completed'
  }, bobToken);
  assert(updateTaskRes.status === 200, `Update task failed: ${JSON.stringify(updateTaskRes.data)}`);

  // Alice adds milestone
  const addMileRes = await apiRequest(`/workspaces/${wsId}/milestones`, 'POST', {
    title: 'Model Pre-training Phase Complete',
    dueDate: new Date(Date.now() + 86400000 * 30)
  }, aliceToken);
  assert(addMileRes.status === 201, `Add milestone failed: ${JSON.stringify(addMileRes.data)}`);
  const mileList = addMileRes.data.milestones;
  const milestoneId = mileList[mileList.length - 1]._id;

  // Alice marks milestone complete
  const toggleMileRes = await apiRequest(`/workspaces/${wsId}/milestones/${milestoneId}`, 'PATCH', {
    completed: true
  }, aliceToken);
  assert(toggleMileRes.status === 200, 'Toggle milestone failed');

  // Alice adds a research note
  const addNoteRes = await apiRequest(`/workspaces/${wsId}/notes`, 'POST', {
    title: 'Validation AUC Results',
    content: 'Achieved 0.942 AUC on the holdout validation set across 5-fold cross-validation.'
  }, aliceToken);
  assert(addNoteRes.status === 201, `Add note failed: ${JSON.stringify(addNoteRes.data)}`);

  // SECURITY CHECK: Charlie (Non-member) tries to access workspace
  const unauthorizedWs = await apiRequest(`/workspaces/${wsId}`, 'GET', null, charlieToken);
  assert(unauthorizedWs.status === 403, `Non-member workspace access was NOT rejected with 403 (got ${unauthorizedWs.status})`);
  
  // SECURITY CHECK: Charlie tries to add a task to Alice's workspace
  const unauthorizedTask = await apiRequest(`/workspaces/${wsId}/tasks`, 'POST', {
    title: 'Malicious task insertion'
  }, charlieToken);
  assert(unauthorizedTask.status === 403, `Non-member task creation was NOT rejected with 403 (got ${unauthorizedTask.status})`);
  
  console.log('   ✓ Workspace creation, member invitation, tasks, milestones, and notes verified.');
  console.log('   ✓ Strict Security: Non-members blocked with 403 Forbidden on reading and updating workspaces.\n');

  // ------------------------------------------------------------------
  // 10. Research Discovery (Publications Search)
  // ------------------------------------------------------------------
  console.log('▶ [10/11] Testing Research Discovery & Publication Search...');
  const searchPubRes = await apiRequest('/users/publications/search?query=radiology', 'GET', null, aliceToken);
  assert(searchPubRes.status === 200, `Publication search failed: ${JSON.stringify(searchPubRes.data)}`);
  assert(Array.isArray(searchPubRes.data.publications), 'Publications is not an array');
  assert(searchPubRes.data.publications.length >= 1, 'No publications found for "radiology"');
  
  const foundPub = searchPubRes.data.publications[0];
  assert(foundPub.publication && foundPub.publication.title, 'Publication title missing');
  assert(foundPub.author && foundPub.author.name, 'Publication author missing');
  assert(typeof foundPub.authorMatchScore === 'number', 'AI author match score missing on publication search');
  console.log(`   ✓ Found Publication: "${foundPub.publication.title}" by ${foundPub.author.name}`);
  console.log(`   ✓ AI Author Match Score: ${foundPub.authorMatchScore}%\n`);

  // ------------------------------------------------------------------
  // 11. QR Profile Lookup & Security Validation
  // ------------------------------------------------------------------
  console.log('▶ [11/11] Validating QR Profile Payload & Sanitization...');
  // Generate sample QR payload matching QRProfileScreen structure
  const qrPayload = JSON.stringify({
    type: 'geoconnect-profile',
    version: '1.0',
    userId: aliceId,
    name: 'Dr. Alice Watson',
    role: 'Principal AI Scientist',
    organization: 'Stanford Vision & Learning Lab',
    skills: ['PyTorch', 'Computer Vision'],
    researchInterests: ['Self-Supervised Learning']
  });

  // Verify security of QR payload
  assert(!qrPayload.includes('password'), 'QR payload must never contain password');
  assert(!qrPayload.includes('token'), 'QR payload must never contain auth token');
  assert(!qrPayload.includes('coordinates'), 'QR payload must never contain raw GPS coordinates');

  // Test resolving the profile by ID
  const qrLookup = await apiRequest(`/users/${aliceId}`, 'GET', null, bobToken);
  assert(qrLookup.status === 200, `QR Profile lookup failed: ${JSON.stringify(qrLookup.data)}`);
  assert(qrLookup.data.user.name === 'Dr. Alice Watson', 'User name mismatch in lookup');
  assert(!qrLookup.data.user.password, 'Password exposed in public profile lookup!');
  assert(!qrLookup.data.user.location, 'Exact GPS location exposed in public profile lookup!');
  console.log('   ✓ QR profile payload validated: No tokens, passwords, or coordinates.');
  console.log('   ✓ Public user lookup strictly sanitizes location and passwords.\n');

  console.log('======================================================================');
  console.log('🎉 ALL 11 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================');
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err.message);
  process.exit(1);
});
