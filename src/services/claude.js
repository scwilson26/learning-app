import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate just the hook/opening for an article (fast, ~1-2 sentences)
 * @param {string} topic - The topic to explore
 * @returns {Promise<{hook: string}>}
 */
export async function generateArticleHook(topic) {
  try {
    const prompt = `Write a 1-2 sentence OPENING HOOK about "${topic}" that makes readers desperate to learn more.

CRITICAL: Start with a shocking fact FIRST, then weave in what it is.

❌ NEVER use generic openings like:
- "Imagine a time when..."
- "Picture a world where..."
- "In a time before..."

✅ ALWAYS start with: [Mind-blowing fact that naturally reveals what this is]

EXAMPLES:
- "The Praetorian Guard was supposed to protect Roman emperors. Instead, they murdered more emperors than they saved."
- "Aboriginal songs can navigate 40,000 miles of Australian desert with perfect accuracy - no maps, no roads, no landmarks."
- "We still can't figure out how to make Roman concrete - and theirs gets stronger with time while ours crumbles."

Write ONLY the hook - 1-2 sentences max. No title, no body, just the hook.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    return { hook: message.content[0].text.trim() };
  } catch (error) {
    console.error('Error generating hook:', error);
    throw new Error('Failed to generate hook');
  }
}

/**
 * Generate the body of an article (after hook is already shown)
 * @param {string} topic - The topic to explore
 * @param {string} hook - The hook that was already generated
 * @returns {Promise<{content: string, hyperlinks: Array<string>, suggestions: Object}>}
 */
export async function generateArticleBody(topic, hook) {
  try {
    const prompt = `Continue writing a SHORT article about "${topic}" after this opening hook:

"${hook}"

BODY (6-8 VERY SHORT paragraphs):
Write like an AUDIOBOOK NARRATOR - engaging, conversational, easy to read aloud.

WRITING STYLE - CRITICAL:
- Just tell the story. No analysis. No commentary. Just WHAT HAPPENED.
- Short, punchy sentences. One idea per sentence.
- Active voice, not passive ("Washington freed his slaves" not "slaves were freed by Washington")
- Simple words. If a 5th grader wouldn't understand it, don't use it.
- **Use past tense for historical events**
- NO explaining why things matter - just state the facts and move on

BANNED WORDS/PHRASES (never use these):
❌ "contradiction", "defined", "unprecedented", "significance", "notably"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ Any sentence that starts with "It was..." or "There was..."
❌ "turned X into Y" (too analytical - just say what happened)

PARAGRAPH STRUCTURE:
- 2-3 sentences max per paragraph
- End with hooks that create curiosity
- Leave gaps - don't explain everything
- Make facts surprising or counterintuitive

SECTION HEADERS:
Use 1-2 headers that create curiosity (use ## markdown format).
- Make them intriguing but not clickbait

HYPERLINKS - CRITICAL FORMAT:
Use EXACTLY [[double brackets]] around hyperlinks. NOT single brackets [term]. ONLY [[term]].

HYPERLINK STRATEGY:
- Aim for 5-10 hyperlinks per article
- Each link should make the reader think "huh, I never thought about that"
- Prioritize specificity: "[[Cloaca Maxima]]" over "sewers"
- Only link the FIRST mention of each term
- Ask: "Would I click this at 2 AM down a rabbit hole?" If no, skip it

CRITICAL HYPERLINK RULES:
1. **ONLY hyperlink NOUNS** (people, places, things, events, concepts)
2. **Make hyperlinks SPECIFIC and UNAMBIGUOUS**:
   - ❌ NEVER: "[[Old City]]" → ✅ ALWAYS: "[[Old City of Jerusalem]]"
   - ❌ NEVER: "[[Revolution]]" → ✅ ALWAYS: "[[French Revolution]]"
   - Full names for people: "[[Albert Einstein]]" not "[[Einstein]]"

Write ONLY the body paragraphs - do NOT repeat the hook.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text;

    // Filter out generic/ambiguous hyperlinks
    const genericPatterns = [
      /\[\[(British|American|French|German|Russian|Chinese|Japanese) (Ambassador|President|General|King|Queen|Emperor|Minister|Senator|Representative)\]\]/gi,
      /\[\[(the )?(Ambassador|President|General|Minister|King|Queen|Emperor|Senator|Representative)\]\]/gi,
      /\[\[Old City\]\]/gi,
      /\[\[Temple\]\]/gi,
      /\[\[Revolution\]\]/gi,
      /\[\[War\]\]/gi,
      /\[\[Empire\]\]/gi,
      /\[\[Battle\]\]/gi,
      /\[\[\d{4}\]\]/g,
      /\[\[\d+\]\]/g,
      /\[\[[A-Z][a-z]+\]\]/g,
      /\[\[[A-Z][a-z]+ (researchers?|scientists?|studies?|team|professors?|experts?|engineers?|doctors?|officials?)\]\]/gi,
    ];

    genericPatterns.forEach(pattern => {
      content = content.replace(pattern, (match) => match.slice(2, -2));
    });

    // Extract hyperlinks
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    // Generate suggestions
    const suggestionsPrompt = `Based on the article about "${topic}", suggest topics for "Where to next?"

Generate TWO categories:

1. RELATED (2-3 topics): The MAIN CHARACTERS and PIVOTAL EVENTS of the story
   - ONLY suggest people/places/events that are CENTRAL to the narrative
   - Ask: "Is this a main character or just mentioned in passing?"
   - ❌ DON'T suggest every person mentioned - skip background figures
   - ✅ DO suggest: the protagonist, the key turning point, what happens next
   - Example for "Chocolate Warfare": "Brother Francisco Valdez" (started it), "Battle of Cacao Bay" (climax), "Treaty of Sweet Peace" (resolution)
   - Example for "Pac-Man Ghost AI": "Toru Iwatani" (creator), "Ghost Personalities" (core mechanic)

2. TANGENTS (2-3 topics): Surprising cross-domain connections
   - "I never thought about THAT connection!"
   - Bridge to completely different fields
   - Example for "Pac-Man Ghost AI": "Predator Psychology", "Military Flanking Tactics"

CRITICAL: Related = continue THIS story. Tangents = jump to something unexpected.

Article context:
${content.substring(0, 500)}

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "related": ["Topic 1", "Topic 2", "Topic 3"],
  "tangents": ["Topic 1", "Topic 2", "Topic 3"]
}

LENGTH: 1-3 words per topic. Keep them SHORT!`;

    const suggestionsMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: suggestionsPrompt }]
    });

    let suggestions = { related: [], tangents: [] };
    try {
      const suggestionsText = suggestionsMessage.content[0].text.trim();
      const jsonText = suggestionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      suggestions = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
    }

    return { content, hyperlinks, suggestions };
  } catch (error) {
    console.error('Error generating article body:', error);
    throw new Error('Failed to generate article body');
  }
}

/**
 * Generate narrative article with embedded hyperlinks
 * @param {string} topic - The topic to explore
 * @param {Function} onProgress - Progress callback (message)
 * @returns {Promise<{hook: string, content: string, hyperlinks: Array<string>}>}
 */
export async function generateFullArticle(topic, onProgress = () => {}) {
  try {
    onProgress('Crafting your story...');

    const prompt = `Write a SHORT article about "${topic}" designed to make the reader want to explore more.

OPENING HOOK (1-2 sentences):
CRITICAL: Start with a shocking fact FIRST, then weave in what it is.

❌ NEVER use generic openings like:
- "Imagine a time when..."
- "Imagine a place where..."
- "Picture a world where..."
- "In a time before..."
- "Long ago..."

✅ ALWAYS start with: [Mind-blowing fact that naturally reveals what this is]

EXAMPLES:
- "The Praetorian Guard was supposed to protect Roman emperors. Instead, they murdered more emperors than they saved."
  (Hook grabs you → naturally reveals they're bodyguards)

- "Aboriginal songs can navigate 40,000 miles of Australian desert with perfect accuracy - no maps, no roads, no landmarks. These are dream maps: knowledge encoded in music."
  (Hook grabs you → definition comes second)

- "We still can't figure out how to make Roman concrete - and theirs gets stronger with time while ours crumbles."
  (Hook grabs you → you already know what concrete is from context)

- "A single street corner can make you feel anxious, nostalgic, or mysteriously energized - and nobody can explain why. Psychogeography tries to explain how places mess with our emotions."
  (Hook grabs you → flows naturally into the topic)

FIRST sentence = shocking/weird/fascinating fact. SECOND sentence = what we're talking about (if needed).

❌ NEVER USE THESE FORMULAIC PATTERNS:
- "This is [topic]:" or "This is [topic] -" (too textbook-y)
- "Welcome to the world of..."
- "[Topic] is the study of..."
- Any sentence that sounds like a dictionary definition

BODY (6-8 VERY SHORT paragraphs):
Write like an AUDIOBOOK NARRATOR - engaging, conversational, easy to read aloud.

WRITING STYLE - CRITICAL:
- Just tell the story. No analysis. No commentary. Just WHAT HAPPENED.
- Short, punchy sentences. One idea per sentence.
- Active voice, not passive ("Washington freed his slaves" not "slaves were freed by Washington")
- Simple words. If a 5th grader wouldn't understand it, don't use it.
- **Use past tense for historical events**
- NO explaining why things matter - just state the facts and move on

BANNED WORDS/PHRASES (never use these):
❌ "contradiction", "defined", "unprecedented", "significance", "notably"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ Any sentence that starts with "It was..." or "There was..."
❌ "turned X into Y" (too analytical - just say what happened)

TONE EXAMPLES:
❌ BAD: "His brilliance lay in keeping the Continental Army alive through brutal winters"
✅ GOOD: "Washington kept the Continental Army alive through brutal winters. Nobody knows how."

❌ BAD: "The contradiction defined his entire life"
✅ GOOD: "Washington owned 300 slaves. Then he freed them all."

❌ BAD: "He turned retreat into an art form"
✅ GOOD: "Washington lost more battles than he won. He kept retreating. It worked."

❌ BAD: "His genius wasn't tactics. It was understanding that America just had to not lose."
✅ GOOD: "Washington didn't need to win battles. He just needed to survive. Britain had to win. America just had to not lose."

PARAGRAPH STRUCTURE:
- 2-3 sentences max per paragraph
- End with hooks that create curiosity
- Leave gaps - don't explain everything
- Make facts surprising or counterintuitive

SECTION HEADERS:
Use 1-2 headers that create curiosity (use ## markdown format).
- Make them intriguing but not clickbait
- ❌ NOT: "The 5th Century: Democracy and Philosophy"
- ✅ YES: "The Experiment That Changed Politics" or "When Citizens Became Rulers"

HYPERLINKS - CRITICAL FORMAT:
Use EXACTLY [[double brackets]] around hyperlinks. NOT single brackets [term]. ONLY [[term]].

HYPERLINK STRATEGY:
- Aim for 5-10 hyperlinks per article (enough to feel rich, not overwhelming)
- Each link should make the reader think "huh, I never thought about that"
- Prioritize specificity: "[[Cloaca Maxima]]" over "sewers", "[[hypocaust heating]]" over "Roman technology"
- Mix it up: some links go deeper (zoom in on details), some go sideways (unexpected connections), some bridge to completely different domains
- The BEST links create surprise: "How does gladiator medicine connect to modern sports surgery?"
- Link proper nouns (people, places, events) over generic concepts
- Only link the FIRST mention of each term
- Ask: "Would I click this at 2 AM down a rabbit hole?" If no, skip it

Special bonus points for:
- Pop culture connections (Game of Thrones, movies, modern references)
- Weird but real historical connections between distant topics
- Technical deep-dives that sound impossible ("Wait, Roman concrete is BETTER than modern?")
- Human stories that are stranger than fiction

CRITICAL HYPERLINK RULES - FOLLOW THESE STRICTLY:

1. **ONLY hyperlink NOUNS** (people, places, things, events, concepts, methods)
   - ✅ YES: "[[William Harvey]]", "[[Great Depression]]", "[[Wall Street]]"
   - ❌ NEVER: verbs, adjectives, or bare numbers

2. **Make hyperlinks SPECIFIC and UNAMBIGUOUS**:
   - ❌ NEVER: "[[Old City]]" → ✅ ALWAYS: "[[Old City of Jerusalem]]"
   - ❌ NEVER: "[[Temple]]" → ✅ ALWAYS: "[[Second Temple]]"
   - ❌ NEVER: "[[Revolution]]" → ✅ ALWAYS: "[[French Revolution]]"
   - ❌ NEVER: "[[1929]]" → ✅ ALWAYS: "[[Great Depression]]" or "[[Stock Market Crash of 1929]]"

   **CRITICAL for names**: Even if text uses last name only, the hyperlink MUST be the full name:
   - Text: "Reynolds lost his license" → Write: "[[Michael Reynolds]] lost his license"
   - Text: "Einstein proved it" → Write: "[[Albert Einstein]] proved it"
   - ❌ NEVER just "[[Reynolds]]" or "[[Einstein]]" - always use full identifiable name

3. **DO NOT hyperlink**:
   - Generic adjectives or verbs
   - Bare numbers without context (no "[[1929]]" by itself)
   - Common words like "time", "place", "people"
   - Generic professions without names
   - Generic institutional phrases like "Harvard researchers", "MIT scientists", "NASA engineers" (too vague - who specifically?)`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text;

    // Filter out generic/ambiguous hyperlinks
    const genericPatterns = [
      /\[\[(British|American|French|German|Russian|Chinese|Japanese) (Ambassador|President|General|King|Queen|Emperor|Minister|Senator|Representative)\]\]/gi,
      /\[\[(the )?(Ambassador|President|General|Minister|King|Queen|Emperor|Senator|Representative)\]\]/gi,
      /\[\[Old City\]\]/gi,
      /\[\[Temple\]\]/gi,
      /\[\[Revolution\]\]/gi,
      /\[\[War\]\]/gi,
      /\[\[Empire\]\]/gi,
      /\[\[Battle\]\]/gi,
      /\[\[\d{4}\]\]/g, // Bare years like [[1929]]
      /\[\[\d+\]\]/g, // Any bare number
      /\[\[[A-Z][a-z]+\]\]/g, // Single capitalized words (likely last names like "Reynolds")
      /\[\[[A-Z][a-z]+ (researchers?|scientists?|studies?|team|professors?|experts?|engineers?|doctors?|officials?)\]\]/gi, // "Harvard researchers", "MIT scientists", etc.
    ];

    // Remove the brackets from generic terms (leave the text, remove hyperlink)
    genericPatterns.forEach(pattern => {
      content = content.replace(pattern, (match) => {
        // Extract the text without brackets
        return match.slice(2, -2);
      });
    });

    // Extract hyperlinks from [[term]] format (after filtering)
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    // Generate "Where to next?" suggestions
    onProgress('Finding connections...');
    const suggestionsPrompt = `Based on the article about "${topic}", suggest topics for "Where to next?"

Generate TWO categories:

1. RELATED (2-3 topics): Direct, logical next steps
   - Should be closely connected to the main topic
   - Natural continuations or deep dives

2. TANGENTS (2-3 topics): Unexpected but fascinating jumps
   - Surprising connections that make you go "huh!"
   - Can bridge to completely different domains
   - The "Wikipedia rabbit hole" effect

Article context:
${content.substring(0, 500)}

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "related": ["Topic 1", "Topic 2", "Topic 3"],
  "tangents": ["Topic 1", "Topic 2", "Topic 3"]
}

LENGTH REQUIREMENTS:
- 1 word is ideal
- 2-3 words okay for proper nouns/events
- Never use long descriptive phrases

Make tangents SURPRISING and keep them SHORT!`;

    const suggestionsMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: suggestionsPrompt }]
    });

    let suggestions = { related: [], tangents: [] };
    try {
      const suggestionsText = suggestionsMessage.content[0].text.trim();
      // Remove markdown code blocks if present
      const jsonText = suggestionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      suggestions = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      // Fallback to empty arrays if parsing fails
    }

    // Split into hook (first paragraph) and rest
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const hook = paragraphs[0] || '';
    const body = paragraphs.slice(1).join('\n\n');

    return { hook, content: body, hyperlinks, suggestions };
  } catch (error) {
    console.error('Error generating article:', error);
    throw new Error('Failed to generate article');
  }
}

/**
 * Generate a Quick Card (2-3 sentences) for a hyperlinked term
 * @param {string} term - The term to explain
 * @returns {Promise<{text: string, hyperlinks: Array<string>}>}
 */
export async function generateQuickCard(term) {
  try {
    const prompt = `Write a Quick Card about "${term}".

CRITICAL: Focus ONLY on "${term}" itself - its most fascinating facts, history, or characteristics.
Do NOT focus on how it relates to any other topic. The reader wants to learn about "${term}" specifically.

GOAL: Make them go "WHAT?!" and immediately click "Go Deeper"

WRITING STYLE - CRITICAL:
- Exactly 2-3 SHORT sentences
- Lead with the WEIRDEST, most shocking fact ABOUT "${term}"
- **Use past tense for historical events**
- Simple words, punchy sentences
- NO context-setting or explanations
- Just state the shocking facts and STOP

NEVER END WITH A QUESTION:
❌ BAD: "Could this have changed history?"
❌ BAD: "What secrets does it still hold?"
✅ GOOD: "Nobody knows why."
✅ GOOD: "We still can't figure out how they did it."
✅ GOOD: "He vanished and was never seen again."

BANNED PHRASES - ABSOLUTELY NEVER USE THESE:
❌ "Here's the Quick Card" / "Here's a Quick Card" / "Here is the Quick Card"
❌ "This is the Quick Card" / "Quick Card:"
❌ "Remarkably..."
❌ "What began as..."
❌ "Could..." (no questions!)
❌ Any rhetorical questions
❌ Any meta-commentary about the card itself

START IMMEDIATELY WITH THE FACTS. No introductions. No preamble.

HYPERLINKS - FORMAT:
Use EXACTLY [[double brackets]] around 1-3 hyperlinks. Keep them simple.

EXAMPLES:

❌ BAD (too much context, ends with question):
"When Michael Ventris cracked the mysterious Linear B script in 1952, he revealed a lost language of the Mycenaean civilization. Could other scripts be waiting?"

✅ GOOD (punchy, dramatic, no question):
"Nobody could read [[Linear B]] until 1952. Turns out it was [[Greek]] - written 500 years before Greeks were supposed to have writing."

❌ BAD (boring, explaining too much):
"The Praetorian Guard were elite soldiers tasked with protecting Roman emperors, but they often became involved in political intrigue."

✅ GOOD (shocking, leaves gaps):
"The [[Praetorian Guard]] murdered more emperors than they protected. In [[193 CE]], they auctioned the throne to the highest bidder."

Write a shocking Quick Card for "${term}" - NO QUESTIONS, just drama:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    });

    let text = message.content[0].text;

    // Strip out any meta-commentary about the card itself
    text = text.replace(/^Here's (the|a) [Qq]uick [Cc]ard[:\s]+/i, '');
    text = text.replace(/^Here is (the|a) [Qq]uick [Cc]ard[:\s]+/i, '');
    text = text.replace(/^This is (the|a) [Qq]uick [Cc]ard[:\s]+/i, '');
    text = text.replace(/^[Qq]uick [Cc]ard:[:\s]+/i, '');
    text = text.trim();

    // Extract hyperlinks
    const hyperlinkMatches = text.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    return { text, hyperlinks };
  } catch (error) {
    console.error('Error generating quick card:', error);
    throw new Error('Failed to generate quick card');
  }
}

/**
 * Generate a random surprising topic
 * @returns {Promise<string>} A fascinating topic to explore
 */
export async function generateSurpriseTopic() {
  try {
    // Pick a random domain to force variety
    const domains = [
      // Wide variety of domains - from academic to pop culture to weird niches
      'Ancient Civilizations', 'Modern Inventions', 'Unsolved Mysteries', 'Failed Products',
      'Weird Laws', 'Urban Legends', 'Conspiracy Theories', 'Cults', 'Scams & Heists',
      'Disasters', 'Medical Oddities', 'Cryptids & Myths', 'Lost Cities', 'Abandoned Places',
      'Extreme Sports', 'Competitive Eating', 'Board Games', 'Video Games', 'Toys',
      'Fast Food', 'Street Food', 'Fermented Foods', 'Banned Foods', 'Food Scandals',
      'One-Hit Wonders', 'Musical Instruments', 'Dance Styles', 'Subcultures', 'Fandoms',
      'Serial Killers', 'Spies & Espionage', 'Pirates', 'Outlaws', 'Assassinations',
      'Space Exploration', 'Deep Sea', 'Caves', 'Deserts', 'Islands',
      'Bridges', 'Skyscrapers', 'Bunkers', 'Prisons', 'Theme Parks',
      'Weapons', 'Poisons', 'Viruses', 'Parasites', 'Fungi',
      'Optical Illusions', 'Magic Tricks', 'Puzzles', 'Riddles', 'Paradoxes',
      'Slang', 'Dead Languages', 'Symbols', 'Flags', 'Currencies',
      'Superstitions', 'Rituals', 'Taboos', 'Etiquette', 'Traditions',
      'Internet Culture', 'Memes', 'Viral Moments', 'Hoaxes', 'Pranks',
      'Movie Props', 'Special Effects', 'Stunts', 'Voice Acting', 'Animation',
      'Sports Scandals', 'Doping', 'Mascots', 'Rivalries', 'Underdog Stories',
      'Royalty', 'Dictators', 'Revolutionaries', 'Inventors', 'Explorers',
      'Fossils', 'Extinction Events', 'Ice Ages', 'Volcanoes', 'Earthquakes',
      'Sleep', 'Dreams', 'Memory', 'Phobias', 'Addictions',
      'Tattoos', 'Body Modification', 'Cosmetic Surgery', 'Hair', 'Makeup',
      'Cocktails', 'Coffee', 'Tea', 'Beer', 'Wine',
      'Candy', 'Chocolate', 'Ice Cream', 'Cheese', 'Bread',
      'Cars', 'Motorcycles', 'Trains', 'Ships', 'Aircraft',
      'Robots', 'AI', 'Hacking', 'Encryption', 'Surveillance'
    ];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    const prompt = `Generate ONE fascinating topic related to: ${randomDomain}

RULES:
1. Pick something specific and surprising - not the obvious choice
2. Make it something that makes people go "wait, what?!"
3. Keep it short: 1-3 words max

Return ONLY the topic name, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      temperature: 1.0,
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating surprise topic:', error);
    throw new Error('Failed to generate surprise topic');
  }
}

/**
 * Generate multiple flashcards from content
 * @param {string} content - The content to create flashcards from
 * @returns {Promise<Array<{question: string, answer: string}>>} Array of flashcard Q&As
 */
export async function generateFlashcard(content) {
  try {
    const prompt = `Based on this learning content, create as many flashcard questions and answers as possible. Extract every concept, fact, relationship, or detail that could be tested. Aim for 5-6 flashcards, but create more if the content supports it.

${content}

Format your response EXACTLY as:
Q: [question 1]
A: [answer 1]

Q: [question 2]
A: [answer 2]

(and so on...)

Make the questions test understanding, not just memorization. Cover different aspects of the content.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const response = message.content[0].text;

    // Parse multiple Q&A pairs
    const flashcards = [];
    const pairs = response.split(/\n\s*\n/); // Split by double newlines

    for (const pair of pairs) {
      const qMatch = pair.match(/Q:\s*(.+?)(?=\nA:)/s);
      const aMatch = pair.match(/A:\s*(.+)/s);

      if (qMatch && aMatch) {
        flashcards.push({
          question: qMatch[1].trim(),
          answer: aMatch[1].trim()
        });
      }
    }

    if (flashcards.length === 0) {
      throw new Error('Failed to parse any flashcards from response');
    }

    return flashcards;
  } catch (error) {
    console.error('Error generating flashcard:', error);
    throw new Error('Failed to generate flashcard');
  }
}
