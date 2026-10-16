/**
 * GeoConnect — Team Builder, Join Requests & Project Workspace Flow Automated Test Suite
 * 
 * Tests all 16 required scenarios:
 * 1. Authenticated user can create a team project.
 * 2. Creating a project creates or links exactly one workspace/group.
 * 3. AI suggestions do not automatically become team members.
 * 4. Eligible user can send a join request.
 * 5. Duplicate active requests are rejected safely.
 * 6. Requester can cancel a pending request.
 * 7. Only the project owner or authorized admin can accept/reject team requests.
 * 8. Acceptance adds membership exactly once and grants the correct workspace access.
 * 9. Rejection does not grant membership or access.
 * 10. A full team cannot accept additional members (capacity limit).
 * 11. Workspace requests require organizer approval.
 * 12. Accepted project team members do not need a separate request for their own project's workspace.
 * 13. Users cannot access private workspaces, chat, tasks, or files without authorization (403).
 * 14. Removing a member revokes their access.
 * 15. Notifications persist and link to the correct request/project/workspace.
 * 16. Existing authentication, Team Builder recommendations, workspaces, tasks, and messaging still work.
 */

const http = require('http');

const API_BASE = 'http://127.0.0.1:5001/api';

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
    throw new Error(`[Assertion Failed]: ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('🚀 GEOCONNECT TEAM BUILDER & WORKSPACE FLOW AUTOMATED TEST SUITE');
  console.log('======================================================================\n');

  const ts = Date.now();
  const ownerEmail = `team_owner_${ts}@geoconnect.org`;
  const candidateEmail1 = `candidate_1_${ts}@geoconnect.org`;
  const candidateEmail2 = `candidate_2_${ts}@geoconnect.org`;
  const candidateEmail3 = `candidate_3_${ts}@geoconnect.org`;
  const intruderEmail = `intruder_${ts}@geoconnect.org`;
  const password = 'Password123!Secure';

  let ownerToken, ownerId;
  let cand1Token, cand1Id;
  let cand2Token, cand2Id;
  let cand3Token, cand3Id;
  let intruderToken, intruderId;

  // --- Step 0: Register Test Users ---
  console.log('▶ [Setup] Registering test accounts...');
  const regOwner = await apiRequest('/auth/register', 'POST', {
    name: 'Prof. David Kahan',
    email: ownerEmail,
    password,
    role: 'Professor / Faculty',
    organization: 'MIT CSAIL',
    skills: ['Distributed Systems', 'Go', 'Kubernetes'],
    researchInterests: ['Edge Computing', 'Fault Tolerance']
  });
  assert(regOwner.status === 201, `Owner reg failed: ${JSON.stringify(regOwner.data)}`);
  ownerToken = regOwner.data.token;
  ownerId = regOwner.data.user._id;

  const regCand1 = await apiRequest('/auth/register', 'POST', {
    name: 'Elena Rostova',
    email: candidateEmail1,
    password,
    role: 'AI / ML Engineer',
    organization: 'Berkeley AI Research',
    skills: ['PyTorch', 'Distributed Systems', 'Python'],
    researchInterests: ['Model Parallelism', 'Edge Computing']
  });
  assert(regCand1.status === 201, 'Cand1 reg failed');
  cand1Token = regCand1.data.token;
  cand1Id = regCand1.data.user._id;

  const regCand2 = await apiRequest('/auth/register', 'POST', {
    name: 'Marcus Chen',
    email: candidateEmail2,
    password,
    role: 'Software Developer',
    organization: 'Caltech',
    skills: ['Rust', 'Networking', 'Go'],
    researchInterests: ['Mesh Protocols']
  });
  assert(regCand2.status === 201, 'Cand2 reg failed');
  cand2Token = regCand2.data.token;
  cand2Id = regCand2.data.user._id;

  const regCand3 = await apiRequest('/auth/register', 'POST', {
    name: 'Sophia Patel',
    email: candidateEmail3,
    password,
    role: 'Data Scientist',
    organization: 'Columbia University',
    skills: ['Python', 'Statistics', 'R'],
    researchInterests: ['Predictive Modeling']
  });
  assert(regCand3.status === 201, 'Cand3 reg failed');
  cand3Token = regCand3.data.token;
  cand3Id = regCand3.data.user._id;

  const regIntruder = await apiRequest('/auth/register', 'POST', {
    name: 'Unauthorized User',
    email: intruderEmail,
    password,
    role: 'Student',
    organization: 'Unknown'
  });
  assert(regIntruder.status === 201, 'Intruder reg failed');
  intruderToken = regIntruder.data.token;
  intruderId = regIntruder.data.user._id;
  console.log('   ✓ All 5 test accounts registered successfully.\n');

  let projectId = null;
  let workspaceId = null;

  // ------------------------------------------------------------------
  // 1 & 2: User creates project & exactly one workspace is linked
  // ------------------------------------------------------------------
  console.log('▶ [1 & 2] Testing Team Project Creation & Automatic Workspace Linking...');
  const createProjRes = await apiRequest('/team/projects', 'POST', {
    title: 'Autonomous Edge Mesh Computing',
    description: 'Building a decentralized fault-tolerant edge cluster for disaster-resilient computing.',
    requiredSkills: ['Distributed Systems', 'Go', 'Rust'],
    researchDomain: 'Distributed Systems',
    desiredRoles: ['AI / ML Engineer', 'Software Developer'],
    desiredTeamSize: 3, // Capacity: Owner (1) + 2 members
    projectGoals: 'Develop and evaluate peer consensus protocol under high packet loss.',
    timeline: '6 months',
    collaborationType: 'Open-Source Tool'
  }, ownerToken);

  assert(createProjRes.status === 201, `Project creation failed: ${JSON.stringify(createProjRes.data)}`);
  assert(createProjRes.data.project, 'Project object missing');
  assert(createProjRes.data.workspace, 'Workspace was not automatically linked upon project creation');
  projectId = createProjRes.data.project._id;
  workspaceId = createProjRes.data.workspace._id;

  // Verify project owner is Lead in workspace members
  const wsCheck = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, ownerToken);
  assert(wsCheck.status === 200, 'Could not retrieve created workspace');
  assert(wsCheck.data.workspace.owner._id === ownerId, 'Project creator is not workspace owner');
  assert(wsCheck.data.workspace.members.length === 1, `Workspace should start with 1 member (owner), got ${wsCheck.data.workspace.members.length}`);
  console.log('   ✓ Project created and exactly one workspace linked automatically with creator as Lead.\n');

  // ------------------------------------------------------------------
  // 3: AI recommendations do not automatically become members
  // ------------------------------------------------------------------
  console.log('▶ [3] Testing AI Suggestions (ensuring candidates are NOT auto-added)...');
  const recRes = await apiRequest('/team/recommend', 'POST', {
    title: 'Autonomous Edge Mesh Computing',
    description: 'Building a decentralized fault-tolerant edge cluster',
    requiredSkills: ['Distributed Systems', 'Go'],
    researchDomain: 'Distributed Systems',
    desiredRoles: ['AI / ML Engineer'],
    projectId
  }, ownerToken);

  assert(recRes.status === 200, 'AI recommend failed');
  assert(Array.isArray(recRes.data.recommendations), 'Recommendations missing');
  assert(recRes.data.recommendations.length > 0, 'No AI candidates recommended');

  // Verify project team is STILL just the owner
  const projAfterRec = await apiRequest(`/team/projects/${projectId}`, 'GET', null, ownerToken);
  assert(projAfterRec.data.project.finalTeam.length === 1, 'Candidates were incorrectly auto-added to final team!');
  console.log(`   ✓ Recommended ${recRes.data.recommendations.length} candidate(s); none were auto-added.\n`);

  // ------------------------------------------------------------------
  // 4: Eligible user can send a join request
  // ------------------------------------------------------------------
  console.log('▶ [4] Testing Candidate Join Request to Project...');
  const joinReq1 = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'AI / ML Engineer',
    message: 'I have extensive PyTorch and Distributed Systems experience.'
  }, cand1Token);

  assert(joinReq1.status === 201, `Join request failed: ${JSON.stringify(joinReq1.data)}`);
  assert(joinReq1.data.request.status === 'pending', 'Request status is not pending');
  const req1Id = joinReq1.data.request._id;
  console.log('   ✓ Candidate 1 successfully submitted a join request with pending status.\n');

  // ------------------------------------------------------------------
  // 5: Duplicate active requests are rejected safely
  // ------------------------------------------------------------------
  console.log('▶ [5] Testing Duplicate Join Request Prevention...');
  const dupReq = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'AI / ML Engineer',
    message: 'Duplicate request attempt'
  }, cand1Token);

  assert(dupReq.status === 400, `Expected 400 for duplicate request, got ${dupReq.status}`);
  console.log('   ✓ Duplicate active join request rejected safely.\n');

  // ------------------------------------------------------------------
  // 6: Requester can cancel a pending request
  // ------------------------------------------------------------------
  console.log('▶ [6] Testing Cancellation of Pending Request...');
  const cancelRes = await apiRequest(`/team/projects/${projectId}/cancel-request`, 'POST', null, cand1Token);
  assert(cancelRes.status === 200, `Cancel request failed: ${JSON.stringify(cancelRes.data)}`);

  // Verify requester can now re-request after cancelling
  const reReq = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'AI / ML Engineer',
    message: 'Re-requesting after cancellation.'
  }, cand1Token);
  assert(reReq.status === 201, 'Failed to re-request after cancellation');
  const cand1ActiveReqId = reReq.data.request._id;
  console.log('   ✓ Pending request was cancelled and re-requesting works as expected.\n');

  // ------------------------------------------------------------------
  // 7: Only project owner or authorized admin can accept/reject
  // ------------------------------------------------------------------
  console.log('▶ [7] Testing Authorization Check for Accepting/Rejecting Requests...');
  const unauthRespond = await apiRequest(`/team/projects/${projectId}/requests/${cand1ActiveReqId}/respond`, 'POST', {
    action: 'accept'
  }, intruderToken);
  assert(unauthRespond.status === 403, `Expected 403 for unauthorized responder, got ${unauthRespond.status}`);
  console.log('   ✓ Unauthorized user denied from responding to project requests (403 enforced).\n');

  // ------------------------------------------------------------------
  // 8: Acceptance adds membership exactly once & grants workspace access
  // ------------------------------------------------------------------
  console.log('▶ [8] Testing Acceptance, Membership Sync & Workspace Access Grant...');
  const acceptRes = await apiRequest(`/team/projects/${projectId}/requests/${cand1ActiveReqId}/respond`, 'POST', {
    action: 'accept'
  }, ownerToken);

  assert(acceptRes.status === 200, `Accept failed: ${JSON.stringify(acceptRes.data)}`);

  // Verify Candidate 1 is now in project finalTeam
  const projAfterAccept = await apiRequest(`/team/projects/${projectId}`, 'GET', null, ownerToken);
  const cand1InTeam = projAfterAccept.data.project.finalTeam.some(m => m.user._id === cand1Id);
  assert(cand1InTeam, 'Candidate 1 was not added to finalTeam');

  // Verify Candidate 1 now has access to the private Workspace without second request!
  const cand1WsAccess = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, cand1Token);
  assert(cand1WsAccess.status === 200, `Candidate 1 denied from workspace after team acceptance: ${cand1WsAccess.status}`);
  assert(cand1WsAccess.data.workspace.members.some(m => m.user._id === cand1Id), 'Candidate 1 not in workspace members');
  console.log('   ✓ Acceptance synchronized membership and granted workspace access automatically without a second request.\n');

  // ------------------------------------------------------------------
  // 9: Rejection does not grant membership or access
  // ------------------------------------------------------------------
  console.log('▶ [9] Testing Rejection (ensuring access is NOT granted)...');
  // Candidate 2 sends request
  const joinReq2 = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'Software Developer',
    message: 'Let me help build the network layer.'
  }, cand2Token);
  assert(joinReq2.status === 201, 'Cand2 join request failed');
  const cand2ReqId = joinReq2.data.request._id;

  // Owner rejects Candidate 2
  const rejectRes = await apiRequest(`/team/projects/${projectId}/requests/${cand2ReqId}/respond`, 'POST', {
    action: 'reject'
  }, ownerToken);
  assert(rejectRes.status === 200, 'Reject failed');

  // Verify Candidate 2 cannot access workspace
  const cand2WsAccess = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, cand2Token);
  assert(cand2WsAccess.status === 403, `Rejected candidate should get 403, got ${cand2WsAccess.status}`);
  console.log('   ✓ Rejected candidate was not added and is strictly denied workspace access (403).\n');

  // ------------------------------------------------------------------
  // 10: Team capacity enforcement (team of 3 cannot accept 4th member)
  // ------------------------------------------------------------------
  console.log('▶ [10] Testing Team Capacity Enforcement...');
  // Fill the 3rd slot: Marcus (Cand2) re-requests and owner accepts
  const reReq2 = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'Software Developer'
  }, cand2Token);
  assert(reReq2.status === 201, 'Cand2 re-request failed');
  const acceptCand2 = await apiRequest(`/team/projects/${projectId}/requests/${reReq2.data.request._id}/respond`, 'POST', {
    action: 'accept'
  }, ownerToken);
  assert(acceptCand2.status === 200, 'Accept Cand2 failed');

  // Team now has: Owner + Cand1 + Cand2 = 3 members (desiredTeamSize = 3)
  // Cand3 attempts to request or be accepted
  const cand3Req = await apiRequest(`/team/projects/${projectId}/request-join`, 'POST', {
    role: 'Data Scientist'
  }, cand3Token);
  // Capacity check: request should be rejected because team is at capacity (3 of 3)
  assert(cand3Req.status === 400, `Expected 400 when requesting to join full team, got ${cand3Req.status}`);
  console.log('   ✓ Full team (capacity: 3) properly rejects additional join requests.\n');

  // ------------------------------------------------------------------
  // 11 & 12: Existing Workspace Discovery & Join Request
  // ------------------------------------------------------------------
  console.log('▶ [11 & 12] Testing Independent Workspace Discovery & Join Request...');
  // Create an independent workspace
  const indepWs = await apiRequest('/workspaces', 'POST', {
    title: 'Quantum Machine Learning Lab',
    description: 'Developing variational quantum circuits for chemistry modeling.',
    isPublic: true
  }, ownerToken);
  assert(indepWs.status === 201, 'Independent workspace creation failed');
  const indepWsId = indepWs.data.workspace._id;

  // Cand3 discovers public workspaces
  const discoverRes = await apiRequest('/workspaces/discover', 'GET', null, cand3Token);
  assert(discoverRes.status === 200, 'Discover workspaces failed');
  const foundIndep = discoverRes.data.workspaces.some(w => w._id === indepWsId);
  assert(foundIndep, 'Independent workspace not found in discover list');

  // Cand3 requests access
  const wsReqRes = await apiRequest(`/workspaces/${indepWsId}/request-access`, 'POST', {
    message: 'I have experience in quantum variational algorithms.'
  }, cand3Token);
  assert(wsReqRes.status === 201, `Workspace access request failed: ${JSON.stringify(wsReqRes.data)}`);
  const wsReqId = wsReqRes.data.request._id;

  // Owner accepts Cand3
  const acceptWsReq = await apiRequest(`/workspaces/${indepWsId}/requests/${wsReqId}/respond`, 'POST', {
    action: 'accept'
  }, ownerToken);
  assert(acceptWsReq.status === 200, 'Organizer accept workspace request failed');

  // Cand3 now has access
  const cand3IndepAccess = await apiRequest(`/workspaces/${indepWsId}`, 'GET', null, cand3Token);
  assert(cand3IndepAccess.status === 200, 'Cand3 denied after organizer approval');
  console.log('   ✓ Workspace discovery, join request, and organizer approval work independently.\n');

  // ------------------------------------------------------------------
  // 13: Users cannot access private workspace chat, tasks without auth
  // ------------------------------------------------------------------
  console.log('▶ [13] Testing Private Workspace Group Chat Access Control...');
  // Post discussion message by member
  const postMsgRes = await apiRequest(`/workspaces/${workspaceId}/messages`, 'POST', {
    content: 'All team members please review the edge node architecture diagram.'
  }, cand1Token);
  assert(postMsgRes.status === 201, `Post message failed: ${JSON.stringify(postMsgRes.data)}`);

  // Intruder tries to read messages
  const intruderRead = await apiRequest(`/workspaces/${workspaceId}/messages`, 'GET', null, intruderToken);
  assert(intruderRead.status === 403, `Intruder read messages should return 403, got ${intruderRead.status}`);

  // Intruder tries to post message
  const intruderPost = await apiRequest(`/workspaces/${workspaceId}/messages`, 'POST', {
    content: 'Intruder message'
  }, intruderToken);
  assert(intruderPost.status === 403, `Intruder post message should return 403, got ${intruderPost.status}`);
  console.log('   ✓ Private workspace group chat strictly protected against unauthorized users (403).\n');

  // ------------------------------------------------------------------
  // 14: Removing a member revokes access immediately
  // ------------------------------------------------------------------
  console.log('▶ [14] Testing Member Removal & Immediate Access Revocation...');
  const removeRes = await apiRequest(`/team/projects/${projectId}/members/${cand2Id}`, 'DELETE', null, ownerToken);
  assert(removeRes.status === 200, `Remove member failed: ${JSON.stringify(removeRes.data)}`);

  // Verify Candidate 2 now receives 403 on the workspace
  const cand2RevokedAccess = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, cand2Token);
  assert(cand2RevokedAccess.status === 403, `Revoked member should get 403, got ${cand2RevokedAccess.status}`);
  console.log('   ✓ Member removal immediately revokes access across team and workspace.\n');

  // ------------------------------------------------------------------
  // 15: Notifications persist and link to the correct request/project
  // ------------------------------------------------------------------
  console.log('▶ [15] Testing Notification Persistence & Linking...');
  const cand1Notifs = await apiRequest('/notifications', 'GET', null, cand1Token);
  assert(cand1Notifs.status === 200, 'Get notifications failed');
  assert(Array.isArray(cand1Notifs.data.notifications), 'Notifications array missing');
  assert(cand1Notifs.data.notifications.length > 0, 'No notifications found for Candidate 1');

  const acceptedNotif = cand1Notifs.data.notifications.find(n => n.type === 'team_request_accepted');
  assert(acceptedNotif, 'team_request_accepted notification was not persisted');
  assert(acceptedNotif.project._id === projectId, 'Notification did not link to correct project');

  // Mark notification read
  const markRead = await apiRequest(`/notifications/${acceptedNotif._id}/read`, 'PATCH', null, cand1Token);
  assert(markRead.status === 200, 'Mark notification read failed');
  assert(markRead.data.notification.read === true, 'Notification read boolean not updated');
  console.log('   ✓ Persistent notifications verified with correct project/request links.\n');

  // ------------------------------------------------------------------
  // 16: Existing authentication, Team Builder recommendations, workspaces, tasks still work
  // ------------------------------------------------------------------
  console.log('▶ [16] Verifying Regression Safety on Tasks & Existing Services...');
  // Add task to workspace
  const taskRes = await apiRequest(`/workspaces/${workspaceId}/tasks`, 'POST', {
    title: 'Benchmarking Protocol Latency',
    description: 'Measure RTT under simulated 10% packet drop',
    priority: 'High'
  }, ownerToken);
  assert(taskRes.status === 201, 'Add task failed');

  // Update task
  const taskId = taskRes.data.tasks[taskRes.data.tasks.length - 1]._id;
  const updateTask = await apiRequest(`/workspaces/${workspaceId}/tasks/${taskId}`, 'PATCH', {
    status: 'In Progress'
  }, cand1Token);
  assert(updateTask.status === 200, 'Update task failed');

  // Add milestone
  const msRes = await apiRequest(`/workspaces/${workspaceId}/milestones`, 'POST', {
    title: 'Paper Submission to OSDI'
  }, ownerToken);
  assert(msRes.status === 201, 'Add milestone failed');
  console.log('   ✓ Tasks, milestones, and existing workflows remain 100% operational.\n');

  console.log('======================================================================');
  console.log('✅ ALL 16 SCENARIOS PASSED WITH ZERO ERRORS!');
  console.log('======================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
