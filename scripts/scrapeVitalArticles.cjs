/**
 * Script to scrape all Wikipedia Vital Articles Level 4
 * Run with: node scripts/scrapeVitalArticles.js
 *
 * This fetches ~10,000 notable article titles organized by category
 */

const fs = require('fs');
const path = require('path');

// All 11 Vital Articles Level 4 category pages
const VITAL_ARTICLE_PAGES = {
  arts: 'Wikipedia:Vital_articles/Level/4/Arts',
  biology: 'Wikipedia:Vital_articles/Level/4/Biology_and_health_sciences',
  everyday: 'Wikipedia:Vital_articles/Level/4/Everyday_life',
  geography: 'Wikipedia:Vital_articles/Level/4/Geography',
  history: 'Wikipedia:Vital_articles/Level/4/History',
  mathematics: 'Wikipedia:Vital_articles/Level/4/Mathematics',
  people: 'Wikipedia:Vital_articles/Level/4/People',
  philosophy: 'Wikipedia:Vital_articles/Level/4/Philosophy_and_religion',
  physics: 'Wikipedia:Vital_articles/Level/4/Physical_sciences',
  society: 'Wikipedia:Vital_articles/Level/4/Society_and_social_sciences',
  technology: 'Wikipedia:Vital_articles/Level/4/Technology',
};

async function fetchArticlesFromPage(pageTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=links&format=json&origin=*`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.parse?.links) {
    console.error(`Failed to parse: ${pageTitle}`);
    return [];
  }

  // Filter to only article namespace (ns=0) and extract titles
  const articles = data.parse.links
    .filter(link => link.ns === 0)
    .map(link => link['*'])
    // Filter out meta pages and lists
    .filter(title => {
      const lower = title.toLowerCase();
      return !lower.startsWith('list of') &&
             !lower.startsWith('lists of') &&
             !lower.startsWith('outline of') &&
             !lower.startsWith('index of') &&
             !lower.startsWith('wikipedia:') &&
             !lower.startsWith('portal:') &&
             !lower.startsWith('category:') &&
             !lower.includes('(disambiguation)');
    });

  return articles;
}

async function scrapeAllVitalArticles() {
  console.log('Starting to scrape Wikipedia Vital Articles Level 4...\n');

  const result = {};
  let totalCount = 0;

  for (const [category, pageTitle] of Object.entries(VITAL_ARTICLE_PAGES)) {
    console.log(`Fetching ${category}...`);

    try {
      const articles = await fetchArticlesFromPage(pageTitle);
      result[category] = articles;
      totalCount += articles.length;
      console.log(`  ✓ ${articles.length} articles`);
    } catch (error) {
      console.error(`  ✗ Error fetching ${category}:`, error.message);
      result[category] = [];
    }

    // Small delay to be nice to Wikipedia
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nTotal articles scraped: ${totalCount}`);

  // Write to JSON file
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'vitalArticles.json');

  // Ensure directory exists
  const dirPath = path.dirname(outputPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outputPath}`);

  // Print sample from each category
  console.log('\n--- Sample articles per category ---');
  for (const [category, articles] of Object.entries(result)) {
    const sample = articles.slice(0, 5).join(', ');
    console.log(`${category}: ${sample}...`);
  }
}

scrapeAllVitalArticles().catch(console.error);
