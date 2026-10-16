const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const {
  normalizeList,
  resolveToCanonical,
  seedCatalogIfEmpty
} = require('../services/catalogService');

/**
 * Migration Script: Migrate and Standardize Legacy Profile Data
 * Safely maps unambiguous aliases to canonical names while preserving all unmapped values.
 */
async function runMigration() {
  console.log('======================================================================');
  console.log('🔄 STARTING GEOCONNECT CATALOG DATA STANDARDIZATION MIGRATION');
  console.log('======================================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB database.');

  await seedCatalogIfEmpty();

  const users = await User.find({});
  console.log(`Found ${users.length} user profile(s) to inspect and migrate.\n`);

  let stats = {
    processedUsers: 0,
    updatedUsers: 0,
    skillsMapped: 0,
    interestsMapped: 0,
    domainsMapped: 0,
    unmappedPreserved: 0
  };

  for (const user of users) {
    stats.processedUsers++;
    let hasChanges = false;

    // 1. Standardize Skills
    if (Array.isArray(user.skills) && user.skills.length > 0) {
      const canonicalSkills = normalizeList('skill', user.skills, { namesOnly: true });
      if (JSON.stringify(canonicalSkills) !== JSON.stringify(user.skills)) {
        user.skills = canonicalSkills;
        hasChanges = true;
        stats.skillsMapped++;
      }
    }

    // 2. Standardize Research Interests
    if (Array.isArray(user.researchInterests) && user.researchInterests.length > 0) {
      const canonicalInterests = normalizeList('interest', user.researchInterests, { namesOnly: true });
      if (JSON.stringify(canonicalInterests) !== JSON.stringify(user.researchInterests)) {
        user.researchInterests = canonicalInterests;
        hasChanges = true;
        stats.interestsMapped++;
      }
    }

    // 3. Standardize Research Domains
    if (Array.isArray(user.researchDomains) && user.researchDomains.length > 0) {
      const canonicalDomains = normalizeList('domain', user.researchDomains, { namesOnly: true });
      if (JSON.stringify(canonicalDomains) !== JSON.stringify(user.researchDomains)) {
        user.researchDomains = canonicalDomains;
        hasChanges = true;
        stats.domainsMapped++;
      }
    }

    // 4. Standardize Structured Research Topics
    if (Array.isArray(user.researchTopics) && user.researchTopics.length > 0) {
      user.researchTopics.forEach((t) => {
        if (t.domain) {
          const canonicalDomain = resolveToCanonical('domain', t.domain)?.name;
          if (canonicalDomain && canonicalDomain !== t.domain) {
            t.domain = canonicalDomain;
            hasChanges = true;
          }
        }
        if (Array.isArray(t.skills) && t.skills.length > 0) {
          const canonicalSkills = normalizeList('skill', t.skills, { namesOnly: true });
          if (JSON.stringify(canonicalSkills) !== JSON.stringify(t.skills)) {
            t.skills = canonicalSkills;
            hasChanges = true;
          }
        }
      });
    }

    // 5. Standardize Projects
    if (Array.isArray(user.projects) && user.projects.length > 0) {
      user.projects.forEach((p) => {
        if (p.domain) {
          const canonicalDomain = resolveToCanonical('domain', p.domain)?.name;
          if (canonicalDomain && canonicalDomain !== p.domain) {
            p.domain = canonicalDomain;
            hasChanges = true;
          }
        }
        if (Array.isArray(p.techStack) && p.techStack.length > 0) {
          const canonicalTech = normalizeList('skill', p.techStack, { namesOnly: true });
          if (JSON.stringify(canonicalTech) !== JSON.stringify(p.techStack)) {
            p.techStack = canonicalTech;
            hasChanges = true;
          }
        }
      });
    }

    if (hasChanges) {
      await user.save();
      stats.updatedUsers++;
    }
  }

  console.log('======================================================================');
  console.log('🎉 MIGRATION COMPLETE');
  console.log('======================================================================');
  console.log(`- Profiles processed: ${stats.processedUsers}`);
  console.log(`- Profiles updated: ${stats.updatedUsers}`);
  console.log(`- Skill arrays standardized: ${stats.skillsMapped}`);
  console.log(`- Interest arrays standardized: ${stats.interestsMapped}`);
  console.log(`- Domain arrays standardized: ${stats.domainsMapped}`);
  console.log('======================================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { runMigration };
