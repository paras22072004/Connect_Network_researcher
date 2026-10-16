const CatalogItem = require('../models/CatalogItem');
const CustomSuggestion = require('../models/CustomSuggestion');
const {
  TECHNICAL_SKILLS,
  RESEARCH_INTERESTS,
  RESEARCH_DOMAINS
} = require('../constants/catalogs');

/**
 * Normalizes input string for reliable comparison:
 * Trims, lowercases, collapses whitespace and hyphens.
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Build fast in-memory lookup maps from predefined catalog constants.
 */
const inMemoryCatalogs = {
  skill: TECHNICAL_SKILLS.map((item) => ({ ...item, type: 'skill', normalizedName: normalizeText(item.name) })),
  interest: RESEARCH_INTERESTS.map((item) => ({ ...item, type: 'interest', normalizedName: normalizeText(item.name) })),
  domain: RESEARCH_DOMAINS.map((item) => ({ ...item, type: 'domain', normalizedName: normalizeText(item.name) }))
};

// Quick lookup maps: Map of normalized alias/name -> canonical item
const lookupMaps = {
  skill: new Map(),
  interest: new Map(),
  domain: new Map()
};

function buildLookupMaps() {
  ['skill', 'interest', 'domain'].forEach((type) => {
    const map = lookupMaps[type];
    map.clear();
    const items = inMemoryCatalogs[type] || [];
    items.forEach((item) => {
      // Map ID
      map.set(item.id.toLowerCase(), item);
      // Map Canonical Name
      map.set(normalizeText(item.name), item);
      // Map Aliases
      if (Array.isArray(item.aliases)) {
        item.aliases.forEach((alias) => {
          map.set(normalizeText(alias), item);
        });
      }
    });
  });
}

// Initial build
buildLookupMaps();

/**
 * Seeds the database collection if items are missing.
 */
async function seedCatalogIfEmpty() {
  try {
    const count = await CatalogItem.countDocuments();
    if (count > 0) return;

    console.log('[CatalogService] Seeding standardized catalogs into database...');
    const allItems = [
      ...inMemoryCatalogs.skill,
      ...inMemoryCatalogs.interest,
      ...inMemoryCatalogs.domain
    ];

    for (const item of allItems) {
      await CatalogItem.findOneAndUpdate(
        { id: item.id },
        {
          id: item.id,
          type: item.type,
          name: item.name,
          normalizedName: item.normalizedName,
          category: item.category || 'General',
          aliases: item.aliases || [],
          description: item.description || '',
          isCustom: false,
          isApproved: true,
          status: 'approved'
        },
        { upsert: true, new: true }
      );
    }
    console.log(`[CatalogService] Seeded ${allItems.length} canonical catalog entries.`);
  } catch (err) {
    console.warn('[CatalogService] DB seed warning (non-fatal, in-memory available):', err.message);
  }
}

/**
 * Resolves any raw string to its canonical catalog entry for a specific catalog type.
 * @param {'skill'|'interest'|'domain'} type
 * @param {string} rawInput
 * @returns {Object|null} Canonical item or null if not found
 */
function resolveToCanonical(type, rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const clean = normalizeText(rawInput);
  if (!clean) return null;

  const map = lookupMaps[type];
  if (!map) return null;

  return map.get(clean) || null;
}

/**
 * Normalizes an array of strings (or objects) into deduplicated canonical entries.
 * Any unmapped item is safely preserved as a clean custom entry without data loss.
 * 
 * @param {'skill'|'interest'|'domain'} type
 * @param {Array<string|Object>} list
 * @param {Object} [options]
 * @param {boolean} [options.namesOnly=false] - If true, returns array of canonical string names
 * @returns {Array} Normalized and deduplicated items
 */
function normalizeList(type, list = [], options = {}) {
  if (!Array.isArray(list)) return [];

  const seenIds = new Set();
  const result = [];

  list.forEach((entry) => {
    const rawText = typeof entry === 'string' ? entry.trim() : (entry?.name || entry?.id || '').trim();
    if (!rawText) return;

    const canonical = resolveToCanonical(type, rawText);

    if (canonical) {
      if (!seenIds.has(canonical.id)) {
        seenIds.add(canonical.id);
        result.push(
          options.namesOnly
            ? canonical.name
            : {
                id: canonical.id,
                name: canonical.name,
                category: canonical.category,
                type: canonical.type,
                isCustom: false
              }
        );
      }
    } else {
      // Unmapped item: preserve exactly as custom entry without loss
      const customId = `custom-${normalizeText(rawText).replace(/\s+/g, '-')}`;
      if (!seenIds.has(customId)) {
        seenIds.add(customId);
        result.push(
          options.namesOnly
            ? rawText
            : {
                id: customId,
                name: rawText,
                category: 'Custom / Other',
                type,
                isCustom: true
              }
        );
      }
    }
  });

  return result;
}

/**
 * Search the catalog with alias awareness.
 * @param {'skill'|'interest'|'domain'} type
 * @param {string} query
 * @param {number} [limit=20]
 */
function searchCatalog(type, query = '', limit = 20) {
  const items = inMemoryCatalogs[type] || [];
  const qClean = normalizeText(query);

  if (!qClean) {
    return items.slice(0, limit).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      type: i.type
    }));
  }

  const matches = [];

  for (const item of items) {
    let matchedAlias = null;

    if (item.normalizedName.includes(qClean)) {
      matches.push({
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type,
        score: item.normalizedName === qClean ? 100 : 70
      });
      continue;
    }

    if (Array.isArray(item.aliases)) {
      for (const alias of item.aliases) {
        const normAlias = normalizeText(alias);
        if (normAlias === qClean || normAlias.includes(qClean)) {
          matchedAlias = alias;
          break;
        }
      }
    }

    if (matchedAlias) {
      matches.push({
        id: item.id,
        name: item.name,
        category: item.category,
        type: item.type,
        matchedAlias,
        score: normalizeText(matchedAlias) === qClean ? 90 : 60
      });
    }
  }

  // Sort exact matches to the top
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

/**
 * Submits a controlled suggestion for a missing catalog entry.
 */
async function suggestCustomItem(type, { name, description = '', category = '' }, userId) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Suggestion name cannot be empty.');
  }

  const trimmedName = name.trim();
  const normalized = normalizeText(trimmedName);

  // 1. Check if it already exists as canonical or alias
  const existingCanonical = resolveToCanonical(type, trimmedName);
  if (existingCanonical) {
    return {
      alreadyExists: true,
      canonicalName: existingCanonical.name,
      canonicalItem: {
        id: existingCanonical.id,
        name: existingCanonical.name,
        category: existingCanonical.category,
        type: existingCanonical.type
      },
      message: `"${trimmedName}" matches existing canonical entry "${existingCanonical.name}".`
    };
  }

  // 2. Check if already pending suggestion
  let suggestion = await CustomSuggestion.findOne({
    type,
    normalizedName: normalized
  });

  if (!suggestion) {
    suggestion = await CustomSuggestion.create({
      type,
      suggestedName: trimmedName,
      normalizedName: normalized,
      description: description.trim(),
      category: category.trim() || 'Community Suggestions',
      suggestedBy: userId,
      status: 'pending'
    });
  }

  // 3. Register in memory as a provisional custom item for the user's session
  const customId = `custom-${normalized.replace(/\s+/g, '-')}`;
  const customItem = {
    id: customId,
    name: trimmedName,
    normalizedName: normalized,
    category: category.trim() || 'Custom / Other',
    type,
    isCustom: true,
    isApproved: false
  };

  lookupMaps[type].set(normalized, customItem);

  return {
    alreadyExists: false,
    suggestion,
    customItem: {
      id: customItem.id,
      name: customItem.name,
      category: customItem.category,
      type: customItem.type,
      isCustom: true
    },
    message: 'Custom suggestion recorded successfully for review.'
  };
}

/**
 * Returns all standardized catalogs grouped by type.
 */
function getAllCatalogs() {
  return {
    skills: inMemoryCatalogs.skill.map((i) => ({ id: i.id, name: i.name, category: i.category, aliases: i.aliases })),
    interests: inMemoryCatalogs.interest.map((i) => ({ id: i.id, name: i.name, category: i.category, aliases: i.aliases })),
    domains: inMemoryCatalogs.domain.map((i) => ({ id: i.id, name: i.name, category: i.category, aliases: i.aliases }))
  };
}

module.exports = {
  TECHNICAL_SKILLS,
  RESEARCH_INTERESTS,
  RESEARCH_DOMAINS,
  normalizeText,
  seedCatalogIfEmpty,
  resolveToCanonical,
  normalizeList,
  searchCatalog,
  suggestCustomItem,
  getAllCatalogs
};
