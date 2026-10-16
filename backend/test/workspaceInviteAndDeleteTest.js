require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Notification = require('../models/Notification');

const API_BASE = 'http://127.0.0.1:5001/api';

function apiRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
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
      reject(new Error(`Timeout on ${method} ${path}`));
    });

    if (data) req.write(data);
    req.end();
  });
}

async function runWorkspaceInviteAndDeleteTest() {
  console.log('======================================================================');
  console.log('🧪 TESTING WORKSPACE MEMBER INVITATIONS & DELETION SUITE');
  console.log('======================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const ts = Date.now();
  // 1. Create two test accounts
  const ownerEmail = `ws_owner_${ts}@test.com`;
  const inviteeEmail = `ws_invitee_${ts}@test.com`;
  const password = 'Password123!';

  const ownerRes = await apiRequest('/auth/register', 'POST', {
    name: 'Workspace Lead Owner',
    email: ownerEmail,
    password,
    role: 'Principal Investigator',
    organization: 'MIT Lab',
    skills: ['Genomics', 'Machine Learning']
  });
  const ownerToken = ownerRes.body.token;
  const ownerId = ownerRes.body.user?._id || ownerRes.body._id;

  const inviteeRes = await apiRequest('/auth/register', 'POST', {
    name: 'Candidate Researcher',
    email: inviteeEmail,
    password,
    role: 'PhD Student',
    organization: 'Stanford Bio',
    skills: ['Bioinformatics']
  });
  const inviteeToken = inviteeRes.body.token;
  const inviteeId = inviteeRes.body.user?._id || inviteeRes.body._id;

  console.log('✓ Test accounts registered: Owner & Invitee');

  // 2. Owner creates a new workspace
  const createWsRes = await apiRequest('/workspaces', 'POST', {
    title: 'Neural Genomics Lab',
    description: 'Collaborative analysis of single-cell sequencing and transformers.',
    status: 'In Progress'
  }, ownerToken);

  if (createWsRes.status !== 201) {
    throw new Error(`Failed to create workspace: ${JSON.stringify(createWsRes.body)}`);
  }
  const workspaceId = createWsRes.body.workspace._id;
  console.log('✓ Workspace created successfully:', workspaceId);

  // 3. Owner invites Invitee
  const inviteRes = await apiRequest(`/workspaces/${workspaceId}/members`, 'POST', {
    userId: inviteeId,
    role: 'Computational Biologist'
  }, ownerToken);

  if (inviteRes.status !== 200 || !inviteRes.body.success) {
    throw new Error(`Failed to send invite: ${JSON.stringify(inviteRes.body)}`);
  }
  console.log('✓ Invitation sent to candidate!');

  // Verify candidate is NOT directly added to workspace members
  const checkWsRes = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, ownerToken);

  const members = checkWsRes.body.workspace.members;
  const isMemberDirectly = members.some(m => (m.user?._id || m.user).toString() === inviteeId.toString());
  if (isMemberDirectly) {
    throw new Error('FAIL: User was added directly as a member without accepting invitation!');
  }
  console.log('✓ Confirmed: Candidate is NOT directly added to workspace.members.');

  // Verify candidate is in pending invitations
  const pendingInvites = checkWsRes.body.workspace.invitations.filter(i => i.status === 'pending');
  if (pendingInvites.length !== 1 || (pendingInvites[0].user?._id || pendingInvites[0].user).toString() !== inviteeId.toString()) {
    throw new Error(`FAIL: Pending invitation not found in workspace: ${JSON.stringify(checkWsRes.body.workspace.invitations)}`);
  }
  const invitationId = pendingInvites[0]._id;
  console.log('✓ Confirmed: Invitation recorded with status "pending":', invitationId);

  // 4. Duplicate invitation is rejected
  const dupInviteRes = await apiRequest(`/workspaces/${workspaceId}/members`, 'POST', {
    userId: inviteeId,
    role: 'Computational Biologist'
  }, ownerToken);

  if (dupInviteRes.status !== 400) {
    throw new Error('FAIL: Duplicate invitation was not blocked with 400!');
  }
  console.log('✓ Confirmed: Duplicate active invitation is safely blocked.');

  // 5. Invitee fetches /api/workspaces/my-invitations
  const myInvitesRes = await apiRequest('/workspaces/my-invitations', 'GET', null, inviteeToken);

  if (myInvitesRes.status !== 200 || !Array.isArray(myInvitesRes.body.invitations)) {
    throw new Error(`Failed to fetch my invitations: ${JSON.stringify(myInvitesRes.body)}`);
  }
  const matchingInvite = myInvitesRes.body.invitations.find(i => i.invitationId.toString() === invitationId.toString());
  if (!matchingInvite || matchingInvite.status !== 'pending') {
    throw new Error('FAIL: Invitee did not receive the invitation in /my-invitations!');
  }
  console.log('✓ Confirmed: Invitee can view pending workspace invitation in /my-invitations.');

  // 6. Invitee accepts the invitation
  const acceptRes = await apiRequest(`/workspaces/${workspaceId}/invitations/${invitationId}/respond`, 'POST', {
    action: 'accept'
  }, inviteeToken);

  if (acceptRes.status !== 200 || !acceptRes.body.success) {
    throw new Error(`Failed to accept invitation: ${JSON.stringify(acceptRes.body)}`);
  }
  console.log('✓ Candidate accepted the workspace invitation!');

  // Verify candidate is now in workspace.members
  const wsAfterAccept = await apiRequest(`/workspaces/${workspaceId}`, 'GET', null, inviteeToken);

  const membersAfterAccept = wsAfterAccept.body.workspace.members;
  const isNowMember = membersAfterAccept.some(m => (m.user?._id || m.user).toString() === inviteeId.toString());
  if (!isNowMember) {
    throw new Error('FAIL: User is still not a member after accepting invitation!');
  }
  console.log('✓ Confirmed: Candidate is now an authorized member of workspace.members.');

  // 7. Non-owner cannot delete workspace
  const nonOwnerDeleteRes = await apiRequest(`/workspaces/${workspaceId}`, 'DELETE', null, inviteeToken);

  if (nonOwnerDeleteRes.status !== 403) {
    throw new Error('FAIL: Non-owner was able to delete workspace or was not blocked with 403!');
  }
  console.log('✓ Confirmed: Non-owner is strictly forbidden from deleting workspace (403 enforced).');

  // 8. Owner deletes workspace
  const ownerDeleteRes = await apiRequest(`/workspaces/${workspaceId}`, 'DELETE', null, ownerToken);

  if (ownerDeleteRes.status !== 200 || !ownerDeleteRes.body.success) {
    throw new Error(`FAIL: Owner could not delete workspace: ${JSON.stringify(ownerDeleteRes.body)}`);
  }
  console.log('✓ Confirmed: Owner successfully deleted the workspace.');

  // Verify workspace no longer exists
  const checkDeletedWs = await Workspace.findById(workspaceId);
  if (checkDeletedWs !== null) {
    throw new Error('FAIL: Workspace was not removed from MongoDB!');
  }
  console.log('✓ Confirmed: Workspace document removed from database.');

  // Cleanup test users
  await User.deleteMany({ _id: { $in: [ownerId, inviteeId] } });
  await Notification.deleteMany({ workspace: workspaceId });
  await mongoose.disconnect();

  console.log('\n======================================================================');
  console.log('🎉 ALL WORKSPACE INVITATION & DELETION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
  process.exit(0);
}

runWorkspaceInviteAndDeleteTest().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
