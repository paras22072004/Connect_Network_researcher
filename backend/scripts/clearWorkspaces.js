const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const clearAllWorkspaces = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('[Connecting] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Connected] MongoDB connection established.');

    const Workspace = require('../models/Workspace');
    const ProjectRequirement = require('../models/ProjectRequirement');
    const Notification = require('../models/Notification');

    // 1. Count workspaces before deletion
    const wsCount = await Workspace.countDocuments();
    console.log(`[Workspaces] Found ${wsCount} workspace document(s) to delete.`);

    // 2. Delete all workspaces
    const deleteResult = await Workspace.deleteMany({});
    console.log(`[Success] Deleted ${deleteResult.deletedCount} workspace(s).`);

    // 3. Unlink workspace references from ProjectRequirements
    const prUpdate = await ProjectRequirement.updateMany(
      {},
      { $set: { workspace: null } }
    );
    console.log(`[ProjectRequirements] Unlinked workspace references across ${prUpdate.modifiedCount} project(s).`);

    // 4. Remove any workspace-related notifications
    const notifDelete = await Notification.deleteMany({
      $or: [
        { type: { $regex: /workspace/i } },
        { workspace: { $exists: true, $ne: null } }
      ]
    });
    console.log(`[Notifications] Cleaned up ${notifDelete.deletedCount} workspace notification(s).`);

    console.log('=======================================================');
    console.log('✅ All workspace stored data deleted successfully!');
    console.log('=======================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Error] Failed to clear workspaces:', error);
    process.exit(1);
  }
};

clearAllWorkspaces();
