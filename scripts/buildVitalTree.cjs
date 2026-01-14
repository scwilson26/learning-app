/**
 * Build hierarchical tree from Wikipedia Vital Articles
 * Uses Claude API to organize articles into learning-focused groups
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY
});

// Configuration - optimized for DEEPER hierarchy
const CONFIG = {
  maxArticlesPerGroup: 15,    // Subdivide if larger (was 50)
  minArticlesPerGroup: 3,     // Don't subdivide if smaller (was 5)
  targetGroupSize: 10,        // Aim for this size (was 20)
  maxDepth: 10,               // Safety limit
  maxArticlesPerApiCall: 300, // Max articles to send in one API call
  source: "wikipedia_vital_4",
  version: "2025-01-14-v2"    // Version bump for new structure
};

// All categories in order
const ALL_CATEGORIES = [
  'people',      // 1,943 - largest, will have deep trees
  'biology',     // 1,488
  'geography',   // 1,204
  'physics',     // 1,107
  'society',     // 925
  'technology',  // 728
  'arts',        // 694
  'history',     // 694
  'everyday',    // 473
  'philosophy',  // 437
  'mathematics'  // 298
];

// Load vital articles
const vitalArticles = require('../src/data/vitalArticles.json');

// Track all assigned articles to detect duplicates
const assignedArticles = new Set();
const duplicates = [];

// Stats tracking
const stats = {
  totalNodes: 0,
  leafNodes: 0,
  branchNodes: 0,
  maxDepth: 0,
  depthCounts: {},
  apiCalls: 0
};

/**
 * Create a URL-safe slug from a title
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Two-phase organization for large categories (>300 articles)
 * Phase 1: Get top-level category names from Claude
 * Phase 2: Assign articles to categories in batches, then merge
 */
async function organizeLargeCategory(articles, categoryName, parentId, depth) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}🔄 Using two-phase organization for ${articles.length} articles`);

  // Phase 1: Get top-level categories (just names, no articles yet)
  console.log(`${indent}📋 Phase 1: Getting category structure...`);

  const structurePrompt = `You are organizing ${articles.length} Wikipedia articles about "${categoryName}" into a learning hierarchy.

First, I need you to define 8-12 TOP-LEVEL categories that will organize ALL these articles.

For "${categoryName}", create broad, meaningful categories. Examples:
- For "People": Scientists & Inventors, Writers & Authors, Political Leaders, Artists, Musicians, Philosophers, Military Leaders, etc.
- For "Geography": Countries, Cities, Mountains & Peaks, Rivers & Lakes, Islands, Deserts, etc.
- For "Biology": Animals, Plants, Human Body, Cells & Genetics, Ecology, Diseases, etc.

Return ONLY valid JSON:
{
  "categories": [
    { "name": "Category Name", "description": "Brief description of what belongs here" }
  ]
}`;

  let categories;
  try {
    stats.apiCalls++;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: structurePrompt }]
    });

    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    categories = parsed.categories;
    console.log(`${indent}   Got ${categories.length} categories:`, categories.map(c => c.name).join(', '));
  } catch (error) {
    console.log(`${indent}❌ Phase 1 failed:`, error.message);
    // Fallback to batch processing
    return null;
  }

  // Phase 2: Assign articles to categories in batches
  console.log(`${indent}📋 Phase 2: Assigning ${articles.length} articles to categories...`);

  const categoryArticles = {};
  categories.forEach(c => categoryArticles[c.name] = []);

  // Process in batches of 300
  const BATCH_SIZE = 300;
  const batches = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push(articles.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`${indent}   Processing batch ${i + 1}/${batches.length} (${batch.length} articles)...`);

    const assignPrompt = `Assign each of these ${batch.length} Wikipedia articles to ONE of these categories:

CATEGORIES:
${categories.map((c, idx) => `${idx + 1}. ${c.name} - ${c.description}`).join('\n')}

ARTICLES TO ASSIGN:
${batch.join('\n')}

Return ONLY valid JSON mapping each article to its category number (1-${categories.length}):
{
  "assignments": {
    "Article Name": 1,
    "Another Article": 3,
    ...
  }
}`;

    try {
      stats.apiCalls++;
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: assignPrompt }]
      });

      const text = response.content[0].text.trim();
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);

      // Add articles to their categories
      for (const [article, catNum] of Object.entries(parsed.assignments)) {
        const catIndex = parseInt(catNum) - 1;
        if (catIndex >= 0 && catIndex < categories.length) {
          const catName = categories[catIndex].name;
          if (batch.includes(article)) {
            categoryArticles[catName].push(article);
          }
        }
      }

      // Check for unassigned articles
      const assigned = new Set(Object.keys(parsed.assignments));
      const unassigned = batch.filter(a => !assigned.has(a));
      if (unassigned.length > 0) {
        console.log(`${indent}   ⚠️  ${unassigned.length} unassigned articles, adding to largest category`);
        const largestCat = Object.entries(categoryArticles).sort((a, b) => b[1].length - a[1].length)[0][0];
        categoryArticles[largestCat].push(...unassigned);
      }

    } catch (error) {
      console.log(`${indent}   ❌ Batch ${i + 1} failed:`, error.message);
      // Add all to "Other" category
      if (!categoryArticles['Other']) categoryArticles['Other'] = [];
      categoryArticles['Other'].push(...batch);
    }
  }

  // Log distribution
  console.log(`${indent}📊 Article distribution:`);
  for (const [name, arts] of Object.entries(categoryArticles)) {
    if (arts.length > 0) {
      console.log(`${indent}   ${name}: ${arts.length} articles`);
    }
  }

  // Build children array and recursively organize each category
  const children = [];
  for (const cat of categories) {
    const catArticles = categoryArticles[cat.name];
    if (!catArticles || catArticles.length === 0) continue;

    const catId = `${parentId}-${slugify(cat.name)}`;
    console.log(`${indent}📁 "${cat.name}": ${catArticles.length} articles`);

    const catChildren = await organizeArticles(catArticles, cat.name, catId, depth + 1);

    stats.branchNodes++;
    stats.totalNodes++;

    children.push({
      id: catId,
      title: cat.name,
      source: CONFIG.source,
      version: CONFIG.version,
      articleCount: catArticles.length,
      children: catChildren
    });
  }

  return children;
}

/**
 * Use Claude to organize articles into subcategories
 */
async function organizeArticles(articles, parentTitle, parentId, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}📂 Organizing "${parentTitle}" (${articles.length} articles, depth ${depth})`);

  // Track max depth
  if (depth > stats.maxDepth) stats.maxDepth = depth;
  stats.depthCounts[depth] = (stats.depthCounts[depth] || 0) + 1;

  if (depth >= CONFIG.maxDepth) {
    console.log(`${indent}⚠️  Max depth reached, creating leaf nodes`);
    return createLeafNodes(articles, parentId, depth);
  }

  // If small enough, just create leaf nodes
  if (articles.length <= CONFIG.maxArticlesPerGroup) {
    console.log(`${indent}✅ Small enough (${articles.length} ≤ ${CONFIG.maxArticlesPerGroup}), creating leaves`);
    return createLeafNodes(articles, parentId, depth);
  }

  // For large categories, use two-phase organization
  // This ensures consistent top-level categories across all articles
  if (articles.length > CONFIG.maxArticlesPerApiCall) {
    console.log(`${indent}🔄 Large category (${articles.length} > ${CONFIG.maxArticlesPerApiCall}), using two-phase organization`);
    const result = await organizeLargeCategory(articles, parentTitle, parentId, depth);
    if (result) {
      return result;
    }
    console.log(`${indent}⚠️  Two-phase failed, falling back to standard organization`);
  }

  // Need to subdivide - use Claude
  const prompt = `You are organizing Wikipedia Vital Articles into a DEEP learning hierarchy.

PARENT CATEGORY: "${parentTitle}"

ARTICLES TO ORGANIZE (${articles.length} total):
${articles.join('\n')}

Create 6-15 logical sub-categories. PRIORITIZE DEPTH over breadth!

CRITICAL: Create a DEEP hierarchy, not a flat one!

GOOD EXAMPLE (deep):
People → Writers & Literary Figures → Novelists → 19th Century Novelists → [Dickens, Austen]

BAD EXAMPLE (flat):
People → [Novelists, Poets, Playwrights, Essayists, Journalists...100 more]

RULES:
1. Every article MUST be assigned to exactly ONE subcategory
2. Subcategory names should be clear, learning-focused (not Wikipedia jargon)
3. Aim for ${CONFIG.targetGroupSize} articles per group (max ${CONFIG.maxArticlesPerGroup})
4. Group by TOPIC, not alphabetically - NEVER use alphabetical splits like "A-C"
5. Create MORE categories with FEWER items each - this enables deeper nesting
6. For PEOPLE: group by profession, then by sub-field, then by era/region
7. For GEOGRAPHY: group by type, then by region, then by specific area
8. For HISTORY: group by era, then by region/topic, then by specific events
9. Be SPECIFIC - "19th Century British Novelists" is better than "Novelists"

Return ONLY valid JSON (no markdown, no explanation):
{
  "subcategories": [
    {
      "name": "Subcategory Name",
      "articles": ["Article 1", "Article 2", ...]
    }
  ]
}`;

  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`${indent}🤖 Calling Claude API...`);
      stats.apiCalls++;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text.trim();

      // Try to parse JSON
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      if (!parsed.subcategories || !Array.isArray(parsed.subcategories)) {
        throw new Error('Invalid response structure');
      }

      // Validate that all articles are assigned
      const assigned = new Set();
      for (const sub of parsed.subcategories) {
        for (const article of sub.articles) {
          assigned.add(article);
        }
      }

      // Check for missing articles
      const missing = articles.filter(a => !assigned.has(a));
      if (missing.length > 0) {
        console.log(`${indent}⚠️  ${missing.length} articles not assigned, adding to "Other"`);
        const otherSub = parsed.subcategories.find(s => s.name.toLowerCase().includes('other'));
        if (otherSub) {
          otherSub.articles.push(...missing);
        } else {
          parsed.subcategories.push({
            name: 'Other Topics',
            articles: missing
          });
        }
      }

      // Build children nodes
      const children = [];
      for (const sub of parsed.subcategories) {
        const subId = `${parentId}-${slugify(sub.name)}`;
        const subArticles = sub.articles.filter(a => articles.includes(a)); // Only valid articles

        if (subArticles.length === 0) continue;

        console.log(`${indent}  📁 "${sub.name}": ${subArticles.length} articles`);

        // Recursively organize if needed
        const subChildren = await organizeArticles(subArticles, sub.name, subId, depth + 1);

        stats.branchNodes++;
        stats.totalNodes++;

        children.push({
          id: subId,
          title: sub.name,
          source: CONFIG.source,
          version: CONFIG.version,
          articleCount: subArticles.length,
          children: subChildren
        });
      }

      return children;

    } catch (error) {
      retries--;
      console.log(`${indent}❌ Error: ${error.message}`);
      if (retries > 0) {
        console.log(`${indent}🔄 Retrying... (${retries} left)`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log(`${indent}⚠️  Failed after retries, doing simple topic split`);
        // Fallback: split into roughly equal chunks
        return fallbackSplit(articles, parentId, parentTitle, depth);
      }
    }
  }
}

/**
 * Fallback splitting when API fails - create reasonable topic groups
 */
async function fallbackSplit(articles, parentId, parentTitle, depth) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}🔧 Using fallback split...`);

  // Split into chunks of ~40 articles each
  const chunkSize = 40;
  const numChunks = Math.ceil(articles.length / chunkSize);
  const children = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const chunk = articles.slice(start, start + chunkSize);
    const chunkNum = i + 1;
    const chunkName = `${parentTitle} Part ${chunkNum}`;
    const chunkId = `${parentId}-part-${chunkNum}`;

    console.log(`${indent}  📁 "${chunkName}": ${chunk.length} articles`);

    // Recursively try to organize each chunk
    const chunkChildren = await organizeArticles(chunk, chunkName, chunkId, depth + 1);

    stats.branchNodes++;
    stats.totalNodes++;

    children.push({
      id: chunkId,
      title: chunkName,
      source: CONFIG.source,
      version: CONFIG.version,
      articleCount: chunk.length,
      children: chunkChildren
    });
  }

  return children;
}

/**
 * Create leaf nodes for a set of articles
 */
function createLeafNodes(articles, parentId, depth) {
  return articles.map(title => {
    // Check for duplicates
    if (assignedArticles.has(title)) {
      duplicates.push(title);
    } else {
      assignedArticles.add(title);
    }

    stats.leafNodes++;
    stats.totalNodes++;
    stats.depthCounts[depth + 1] = (stats.depthCounts[depth + 1] || 0) + 1;
    if (depth + 1 > stats.maxDepth) stats.maxDepth = depth + 1;

    return {
      id: `${parentId}-${slugify(title)}`,
      title: title,
      isLeaf: true,
      wikiTitle: title,
      source: CONFIG.source,
      version: CONFIG.version
    };
  });
}

/**
 * Count total articles in a tree
 */
function countArticles(node) {
  if (node.isLeaf) return 1;
  if (!node.children) return 0;
  return node.children.reduce((sum, child) => sum + countArticles(child), 0);
}

/**
 * Get max depth of tree
 */
function getMaxDepth(node, currentDepth = 0) {
  if (node.isLeaf || !node.children || node.children.length === 0) {
    return currentDepth;
  }
  return Math.max(...node.children.map(child => getMaxDepth(child, currentDepth + 1)));
}

/**
 * Build tree for a single category
 */
async function buildCategoryTree(categoryName) {
  const articles = vitalArticles[categoryName];

  if (!articles || articles.length === 0) {
    console.error(`❌ Category "${categoryName}" not found or empty`);
    return null;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 Building tree for: ${categoryName.toUpperCase()} (${articles.length} articles)`);
  console.log(`${'='.repeat(70)}\n`);

  const rootId = categoryName;
  const rootTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

  const children = await organizeArticles(articles, rootTitle, rootId, 0);

  stats.branchNodes++;
  stats.totalNodes++;

  return {
    id: rootId,
    title: rootTitle,
    source: CONFIG.source,
    version: CONFIG.version,
    articleCount: articles.length,
    children: children
  };
}

/**
 * Build the complete tree from all categories
 */
async function buildFullTree() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           VITAL ARTICLES TREE BUILDER - FULL RUN                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\nConfig: max=${CONFIG.maxArticlesPerGroup}, target=${CONFIG.targetGroupSize}, maxDepth=${CONFIG.maxDepth}`);
  console.log(`Categories to process: ${ALL_CATEGORIES.length}`);
  console.log(`Total articles: ${Object.values(vitalArticles).reduce((s, a) => s + a.length, 0)}\n`);

  const startTime = Date.now();
  const categoryTrees = [];

  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const category = ALL_CATEGORIES[i];
    const progress = `[${i + 1}/${ALL_CATEGORIES.length}]`;
    console.log(`\n${progress} Starting ${category}...`);

    const tree = await buildCategoryTree(category);
    if (tree) {
      categoryTrees.push(tree);
    }

    // Show progress
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n${progress} ✅ ${category} complete (${elapsed}s elapsed, ${stats.apiCalls} API calls)`);
  }

  // Build root node
  const fullTree = {
    id: 'root',
    title: 'All Knowledge',
    source: CONFIG.source,
    version: CONFIG.version,
    articleCount: Object.values(vitalArticles).reduce((s, a) => s + a.length, 0),
    children: categoryTrees
  };

  stats.branchNodes++;
  stats.totalNodes++;

  return fullTree;
}

/**
 * Print summary statistics
 */
function printStats(tree) {
  const totalTime = Math.round((Date.now() - globalStartTime) / 1000);

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         FINAL STATISTICS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  console.log(`\n📊 NODE COUNTS:`);
  console.log(`   Total nodes:    ${stats.totalNodes.toLocaleString()}`);
  console.log(`   Branch nodes:   ${stats.branchNodes.toLocaleString()}`);
  console.log(`   Leaf nodes:     ${stats.leafNodes.toLocaleString()}`);

  console.log(`\n📏 DEPTH ANALYSIS:`);
  console.log(`   Max depth:      ${stats.maxDepth}`);

  // Calculate average depth
  let totalDepth = 0;
  let nodeCount = 0;
  for (const [depth, count] of Object.entries(stats.depthCounts)) {
    totalDepth += parseInt(depth) * count;
    nodeCount += count;
  }
  const avgDepth = (totalDepth / nodeCount).toFixed(2);
  console.log(`   Average depth:  ${avgDepth}`);

  console.log(`\n📈 DEPTH DISTRIBUTION:`);
  for (let d = 0; d <= stats.maxDepth; d++) {
    const count = stats.depthCounts[d] || 0;
    const bar = '█'.repeat(Math.min(50, Math.round(count / 100)));
    console.log(`   Depth ${d}: ${count.toString().padStart(5)} ${bar}`);
  }

  console.log(`\n🔄 DUPLICATES FOUND: ${duplicates.length}`);
  if (duplicates.length > 0 && duplicates.length <= 20) {
    duplicates.forEach(d => console.log(`   - ${d}`));
  } else if (duplicates.length > 20) {
    duplicates.slice(0, 20).forEach(d => console.log(`   - ${d}`));
    console.log(`   ... and ${duplicates.length - 20} more`);
  }

  console.log(`\n⏱️  PERFORMANCE:`);
  console.log(`   Total time:     ${totalTime}s (${Math.round(totalTime / 60)}m ${totalTime % 60}s)`);
  console.log(`   API calls:      ${stats.apiCalls}`);
  if (stats.apiCalls > 0) {
    console.log(`   Avg per call:   ${(totalTime / stats.apiCalls).toFixed(1)}s`);
  }

  // Category breakdown
  console.log(`\n📁 CATEGORY BREAKDOWN:`);
  if (tree.children) {
    for (const cat of tree.children) {
      const depth = getMaxDepth(cat);
      const articles = countArticles(cat);
      console.log(`   ${cat.title.padEnd(15)} ${articles.toString().padStart(5)} articles, depth ${depth}`);
    }
  }
}

// Global start time
let globalStartTime;

/**
 * Main function
 */
async function main() {
  globalStartTime = Date.now();

  const singleCategory = process.argv[2];

  if (singleCategory && singleCategory !== 'all') {
    // Single category mode
    const tree = await buildCategoryTree(singleCategory);
    if (tree) {
      const outputPath = path.join(__dirname, '..', 'src', 'data', `vitalTree_${singleCategory}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));
      console.log(`\n💾 Saved to: ${outputPath}`);
      printStats(tree);
    }
  } else {
    // Full tree mode
    const tree = await buildFullTree();

    // Save full tree
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'vitalArticlesTree.json');
    fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));
    console.log(`\n💾 Saved to: ${outputPath}`);

    printStats(tree);
  }
}

main().catch(console.error);
