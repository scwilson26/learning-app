import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate just the hook/opening for an article (fast, ~1-2 sentences)
 * @param {string} topic - The topic to explore
 * @param {string} quickCardText - Optional Quick Card text to build upon
 * @returns {Promise<{hook: string}>}
 */
export async function generateArticleHook(topic, quickCardText = null) {
  try {
    let prompt = `Write a 1-2 sentence OPENING HOOK about "${topic}" that makes readers desperate to learn more.

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

    // If we have Quick Card context, incorporate it
    if (quickCardText) {
      prompt += `

CONTEXT: The reader saw this Quick Card preview and clicked "Go Deeper":
"${quickCardText}"

IMPORTANT: Cover the FULL BREADTH of "${topic}" - not just the example from the preview!
- The Quick Card might have mentioned ONE example (like Derinkuyu for "Underground Cities")
- Your article must cover the WHOLE topic, with MULTIPLE examples
- Don't repeat the Quick Card fact word-for-word, but DO assume they know it
- Start with something NEW that expands their understanding`;
    }

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
 * @param {string} quickCardText - Optional Quick Card text that prompted this article
 * @returns {Promise<{content: string, hyperlinks: Array<string>, suggestions: Object}>}
 */
export async function generateArticleBody(topic, hook, quickCardText = null) {
  try {
    let prompt = `Continue writing a SHORT article about "${topic}" after this opening hook:

"${hook}"

BODY (6-8 VERY SHORT paragraphs):
Write like an AUDIOBOOK NARRATOR - engaging, conversational, easy to read aloud.

FIRST PARAGRAPH RULE - CRITICAL:
The FIRST paragraph after the hook MUST ground the reader on WHY this topic matters.
Ask yourself: "Would someone with ZERO background understand why anyone cares about this?"
If not, your first paragraph must answer: "Why does this exist? What problem does it solve?"

Examples:
- Seed vault? → "Crops fail. Diseases wipe out harvests. If we lose a type of wheat, it's gone forever. Unless someone saved the seeds."
- Roman concrete? → "Our buildings crack after 50 years. Roman buildings have lasted 2,000. We still don't know their secret."
- Praetorian Guard? → "Roman emperors needed bodyguards. They picked the best soldiers. Then those soldiers realized THEY had all the weapons."

Don't assume the reader knows WHY something is interesting. Tell them.

READING LEVEL - CRITICAL:
Write for a 10-year-old. Use simple, everyday words. MAX 15 words per sentence.
- ❌ "subsequently" → ✅ "then"
- ❌ "commenced" → ✅ "started"
- ❌ "utilized" → ✅ "used"
- ❌ "approximately" → ✅ "about"
- ❌ "facilitate" → ✅ "help"
- ❌ "demonstrate" → ✅ "show"
- ❌ "phenomenon" → ✅ describe it simply
If you wouldn't say it to a kid, don't write it.

WRITING STYLE:
- Just tell the story. No analysis. No commentary. Just WHAT HAPPENED.
- Short, punchy sentences. One idea per sentence.
- Active voice ("Washington freed his slaves" not "slaves were freed")
- **Use past tense for historical events**

BANNED WORDS/PHRASES:
❌ "contradiction", "unprecedented", "significance", "notably", "paradigm"
❌ "furthermore", "moreover", "however", "nevertheless", "consequently"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ Any sentence starting with "It was..." or "There was..."
❌ NEVER use headers containing "Why This/It Matters/Mattered" in ANY form - just write naturally

PARAGRAPH STRUCTURE:
- 2-3 sentences max per paragraph
- Make facts surprising or counterintuitive

FINAL PARAGRAPH RULE - CRITICAL:
The LAST paragraph must give CLOSURE. The reader should think "I get it now" and feel confident explaining this topic to a friend.
- Do NOT end on a cliffhanger or unanswered question
- Do NOT ask "But how did they...?" without answering it
- DO wrap up the core idea in a satisfying way
- The Deep Dive is for EXTRA depth, not for finishing the story

❌ BAD: "But how did ninjas actually train? And who were the most famous ones?" (leaves reader hanging)
✅ GOOD: "That's what ninjas really were - spies and saboteurs who won through deception, not combat." (closure)

The reader should be able to stop here and feel satisfied. Deep Dive is a bonus, not a requirement.

GROUNDING SHOCKING FACTS - CRITICAL:
For every "wow" fact, ask: would someone who knows NOTHING about this understand WHY it's wow?
If not, add ONE sentence of context BEFORE the fact so it lands.

Structure: Setup (brief context) → Shocking fact → Let it breathe

❌ BAD: "Police found thousands of hand-drawn frames showing victims' final moments."
✅ GOOD: "Animation requires 24 drawings for each second of film. Police found 14,400 hand-drawn frames in his studio. Each one traced by hand from real footage."

❌ BAD: "The ship carried 7 tons of gold."
✅ GOOD: "A single gold bar weighs 27 pounds. The ship carried 7 tons - enough to fill a school bus."

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

    // If we have Quick Card context, make sure the article covers the FULL topic
    if (quickCardText) {
      prompt += `

CONTEXT: The reader saw this Quick Card and clicked "Go Deeper":
"${quickCardText}"

CRITICAL - COVER THE FULL TOPIC:
- The Quick Card mentioned ONE specific example. Your article must cover MANY examples.
- If they clicked on "Underground Cities" and saw Derinkuyu, talk about underground cities WORLDWIDE - Cappadocia, Cu Chi tunnels, Paris catacombs, Beijing tunnels, etc.
- The reader wants to understand the WHOLE phenomenon, not just the single example they previewed.
- Assume they know the Quick Card fact. Start with something NEW that broadens their view.`;
    }

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

    // Fix quotation marks around hyperlinks - move quotes inside brackets
    // "[[term]]" → [["term"]]  (quotes should be inside if present)
    // But actually, we just want to remove the outer quotes entirely for cleaner rendering
    content = content.replace(/"(\[\[[^\]]+\]\])"/g, '$1');  // "[[term]]" → [[term]]
    content = content.replace(/'(\[\[[^\]]+\]\])'/g, '$1');  // '[[term]]' → [[term]]
    content = content.replace(/"(\[\[[^\]]+\]\])/g, '$1');   // "[[term]] → [[term]]
    content = content.replace(/(\[\[[^\]]+\]\])"/g, '$1');   // [[term]]" → [[term]]
    content = content.replace(/'(\[\[[^\]]+\]\])/g, '$1');   // '[[term]] → [[term]]
    content = content.replace(/(\[\[[^\]]+\]\])'/g, '$1');   // [[term]]' → [[term]]

    // Extract hyperlinks
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    // Generate suggestions - 6 rabbit hole options
    const suggestionsPrompt = `Based on the article about "${topic}", suggest 6 SPECIFIC rabbit holes.

THE RABBIT HOLE TEST:
Each suggestion must be a SPECIFIC thing with a STORY behind it.
Ask yourself: "Would clicking this reveal a surprising story?"

❌ BAD (too abstract/obvious):
- "Failure Rates" (boring concept)
- "Venture Capital" (too obvious if reading about startups)
- "Rejection Psychology" (abstract, no story)
- "Medieval Weapons" (generic category)

✅ GOOD (specific + story-worthy):
- "Theranos" (specific company with wild story)
- "PayPal Mafia" (specific group, unexpected connections)
- "The Traitorous Eight" (specific event with drama)
- "Hattori Hanzo" (specific person with legend)

RULES:
1. NAMED THINGS ONLY - specific people, companies, events, places, inventions
2. BUILT-IN INTRIGUE - the name itself should hint at a story
3. 1-3 words max - keep them SHORT
4. Mix of: 3 that continue the story + 3 unexpected sideways jumps

Article context:
${content.substring(0, 500)}

Return ONLY a JSON object (no markdown):
{
  "related": ["Specific Thing 1", "Specific Thing 2", "Specific Thing 3"],
  "tangents": ["Unexpected Thing 4", "Unexpected Thing 5", "Unexpected Thing 6"]
}`;

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

FIRST PARAGRAPH RULE - CRITICAL:
The FIRST paragraph after the hook MUST ground the reader on WHY this topic matters.
Ask yourself: "Would someone with ZERO background understand why anyone cares about this?"
If not, your first paragraph must answer: "Why does this exist? What problem does it solve?"

Examples:
- Seed vault? → "Crops fail. Diseases wipe out harvests. If we lose a type of wheat, it's gone forever. Unless someone saved the seeds."
- Roman concrete? → "Our buildings crack after 50 years. Roman buildings have lasted 2,000. We still don't know their secret."
- Praetorian Guard? → "Roman emperors needed bodyguards. They picked the best soldiers. Then those soldiers realized THEY had all the weapons."

Don't assume the reader knows WHY something is interesting. Tell them.

READING LEVEL - CRITICAL:
Write for a 10-year-old. Use simple, everyday words. MAX 15 words per sentence.
- ❌ "subsequently" → ✅ "then"
- ❌ "commenced" → ✅ "started"
- ❌ "utilized" → ✅ "used"
- ❌ "approximately" → ✅ "about"
- ❌ "facilitate" → ✅ "help"
- ❌ "demonstrate" → ✅ "show"
- ❌ "phenomenon" → ✅ describe it simply
If you wouldn't say it to a kid, don't write it.

WRITING STYLE:
- Just tell the story. No analysis. No commentary. Just WHAT HAPPENED.
- Short, punchy sentences. One idea per sentence.
- Active voice ("Washington freed his slaves" not "slaves were freed")
- **Use past tense for historical events**

BANNED WORDS/PHRASES:
❌ "contradiction", "unprecedented", "significance", "notably", "paradigm"
❌ "furthermore", "moreover", "however", "nevertheless", "consequently"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ Any sentence starting with "It was..." or "There was..."

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
- Make facts surprising or counterintuitive

GROUNDING SHOCKING FACTS - CRITICAL:
For every "wow" fact, ask: would someone who knows NOTHING about this understand WHY it's wow?
If not, add ONE sentence of context BEFORE the fact so it lands.

Structure: Setup (brief context) → Shocking fact → Let it breathe

❌ BAD: "The reactor released 400 times more radiation than Hiroshima."
✅ GOOD: "The Hiroshima bomb killed 80,000 people instantly. Chernobyl released 400 times more radiation."

Leave mystery about WHAT HAPPENS NEXT. But ground the reader on WHY SOMETHING MATTERS.

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

    // Fix quotation marks around hyperlinks - remove quotes that wrap hyperlinks
    content = content.replace(/"(\[\[[^\]]+\]\])"/g, '$1');  // "[[term]]" → [[term]]
    content = content.replace(/'(\[\[[^\]]+\]\])'/g, '$1');  // '[[term]]' → [[term]]
    content = content.replace(/"(\[\[[^\]]+\]\])/g, '$1');   // "[[term]] → [[term]]
    content = content.replace(/(\[\[[^\]]+\]\])"/g, '$1');   // [[term]]" → [[term]]
    content = content.replace(/'(\[\[[^\]]+\]\])/g, '$1');   // '[[term]] → [[term]]
    content = content.replace(/(\[\[[^\]]+\]\])'/g, '$1');   // [[term]]' → [[term]]

    // Extract hyperlinks from [[term]] format (after filtering)
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    // Generate "Where to next?" suggestions - 6 rabbit hole options
    onProgress('Finding connections...');
    const suggestionsPrompt = `Based on the article about "${topic}", suggest 6 topics for "Where to next?" (the rabbit hole continues!)

Generate 6 DIVERSE topics mixing:
- Key people/places/events from the story (the protagonist, turning points)
- Surprising cross-domain connections ("I never thought about THAT!")
- Deeper dives into fascinating details mentioned

RULES:
- Make each topic feel like clicking it will reveal something amazing
- Mix it up: some continue the story, some jump sideways
- 1-3 words per topic - keep them SHORT!
- NO generic topics - be SPECIFIC

Article context:
${content.substring(0, 500)}

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "related": ["Topic 1", "Topic 2", "Topic 3"],
  "tangents": ["Topic 4", "Topic 5", "Topic 6"]
}`;

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
 * @param {string} context - Optional context (the current article topic) for disambiguation
 * @returns {Promise<{text: string, hyperlinks: Array<string>}>}
 */
export async function generateQuickCard(term, context = null) {
  try {
    const contextHint = context
      ? `\nCONTEXT FOR DISAMBIGUATION: The reader is currently reading about "${context}". If "${term}" is ambiguous (e.g., could be a person, place, movie, video game, etc.), pick the meaning most relevant to "${context}". For example, if reading about horror video games and clicking "Sweet Home", explain the video game, not the town in Oregon.\n`
      : '';

    const prompt = `Write a Quick Card about "${term}".
${contextHint}
CRITICAL: Focus ONLY on "${term}" itself - its most fascinating facts, history, or characteristics.
Do NOT focus on how it relates to any other topic. The reader wants to learn about "${term}" specifically.

GOAL: Make them go "WHAT?!" and immediately click "Go Deeper"

WRITING STYLE - CRITICAL:
- MAXIMUM 2 sentences. No more. Ever.
- Lead with the WEIRDEST, most shocking fact ABOUT "${term}"
- **Use past tense for historical events**
- Simple words a 10-year-old would understand. MAX 15 words per sentence.
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

HYPERLINKS - BE VERY SELECTIVE:
Use EXACTLY [[double brackets]]. Include AT MOST 1-2 hyperlinks, and ONLY if they're:
- A SPECIFIC person, place, event, or thing with its own fascinating story
- Something the reader would ACTUALLY want to rabbit-hole into

❌ BAD hyperlinks (too generic, would loop back):
- [[underground city]] (generic category)
- [[airflow]] (too abstract)
- [[ancient engineers]] (vague group)

✅ GOOD hyperlinks (specific, story-worthy):
- [[Derinkuyu]] (specific place with a story)
- [[193 CE]] (specific event)
- [[Linear B]] (specific thing with mystery)

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

    // Fix quotation marks around hyperlinks - remove quotes that wrap hyperlinks
    text = text.replace(/"(\[\[[^\]]+\]\])"/g, '$1');  // "[[term]]" → [[term]]
    text = text.replace(/'(\[\[[^\]]+\]\])'/g, '$1');  // '[[term]]' → [[term]]
    text = text.replace(/"(\[\[[^\]]+\]\])/g, '$1');   // "[[term]] → [[term]]
    text = text.replace(/(\[\[[^\]]+\]\])"/g, '$1');   // [[term]]" → [[term]]
    text = text.replace(/'(\[\[[^\]]+\]\])/g, '$1');   // '[[term]] → [[term]]
    text = text.replace(/(\[\[[^\]]+\]\])'/g, '$1');   // [[term]]' → [[term]]

    // Extract hyperlinks
    const hyperlinkMatches = text.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    return { text, hyperlinks };
  } catch (error) {
    console.error('Error generating quick card:', error);
    throw new Error('Failed to generate quick card');
  }
}

// Track recent surprise topics to avoid repeats
const RECENT_TOPICS_KEY = 'recentSurpriseTopics';
const MAX_RECENT_TOPICS = 100; // Remember more topics

function getRecentTopics() {
  try {
    const saved = localStorage.getItem(RECENT_TOPICS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function addRecentTopic(topic) {
  try {
    const recent = getRecentTopics();
    // Normalize: lowercase, trim
    const normalized = topic.toLowerCase().trim();
    // Add to front, remove similar entries (partial match), keep max size
    const updated = [topic, ...recent.filter(t => {
      const tNorm = t.toLowerCase().trim();
      // Remove if exact match or one contains the other
      return tNorm !== normalized && !tNorm.includes(normalized) && !normalized.includes(tNorm);
    })].slice(0, MAX_RECENT_TOPICS);
    localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving recent topic:', e);
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
      'Spies & Espionage', 'Pirates', 'Outlaws', 'Heists',
      'Space Exploration', 'Deep Sea', 'Caves', 'Deserts', 'Islands',
      'Bridges', 'Skyscrapers', 'Bunkers', 'Prisons', 'Theme Parks',
      'Weapons', 'Poisons', 'Microbes', 'Symbiosis', 'Bioluminescence',
      'Optical Illusions', 'Magic Tricks', 'Puzzles', 'Riddles', 'Paradoxes',
      'Slang', 'Dead Languages', 'Symbols', 'Flags', 'Currencies',
      'Superstitions', 'Rituals', 'Taboos', 'Etiquette', 'Traditions',
      'Internet Culture', 'Memes', 'Viral Moments', 'Hoaxes', 'Pranks',
      'Movie Props', 'Special Effects', 'Stunts', 'Voice Acting', 'Animation',
      'Sports Scandals', 'Doping', 'Mascots', 'Rivalries', 'Underdog Stories',
      'Royalty', 'Dictators', 'Revolutionaries', 'Inventors', 'Explorers',
      'Fossils', 'Extinction Events', 'Ice Ages', 'Geology', 'Meteorology',
      'Sleep', 'Dreams', 'Memory', 'Phobias', 'Addictions',
      'Tattoos', 'Body Modification', 'Fashion History', 'Makeup', 'Perfume',
      'Cocktails', 'Coffee', 'Tea', 'Beer', 'Wine',
      'Candy', 'Chocolate', 'Ice Cream', 'Cheese', 'Bread',
      'Cars', 'Motorcycles', 'Trains', 'Ships', 'Aircraft',
      'Robots', 'AI', 'Hacking', 'Encryption', 'Surveillance',
      'Architecture', 'Furniture', 'Typography', 'Color Theory', 'Maps',
      'Clocks', 'Calendars', 'Measurement', 'Numbers', 'Zero',
      'Twins', 'Feral Children', 'Prodigies', 'Imposters', 'Amnesia',
      'Cemeteries', 'Mummies', 'Relics', 'Tombs', 'Afterlife Beliefs',
      'Circuses', 'Sideshows', 'Carnivals', 'Street Performers', 'Vaudeville',
      'Duels', 'Feuds', 'Vendettas', 'Honor Codes', 'Secret Societies'
    ];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    // Get recent topics to avoid - show more to Claude so it doesn't repeat
    const recentTopics = getRecentTopics();
    const avoidList = recentTopics.length > 0
      ? `\n\nDO NOT suggest any of these (already shown recently):\n${recentTopics.slice(0, 40).join(', ')}`
      : '';

    const prompt = `Generate ONE fascinating topic related to: ${randomDomain}

RULES:
1. Pick something OBSCURE and surprising - avoid the famous/obvious examples
2. Make it something that makes people go "wait, what?!"
3. Keep it short: 1-3 words max
4. NO generic topics like "Lightning", "Earthquakes", "Volcanoes" - pick SPECIFIC events or phenomena
5. Avoid "zombie" anything, "mind control", and other overused "fascinating fact" tropes${avoidList}

Return ONLY the topic name, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      temperature: 1.0,
      messages: [{ role: 'user', content: prompt }]
    });

    const topic = message.content[0].text.trim();

    // Save to recent topics
    addRecentTopic(topic);

    return topic;
  } catch (error) {
    console.error('Error generating surprise topic:', error);
    throw new Error('Failed to generate surprise topic');
  }
}

/**
 * Generate article continuation (Part 2, 3, or 4)
 * @param {string} topic - The topic being explored
 * @param {string} existingContent - All content generated so far (hook + body + any continuations)
 * @param {number} partNumber - Which part we're generating (2, 3, or 4)
 * @returns {Promise<{content: string, hyperlinks: Array<string>}>}
 */
export async function generateArticleContinuation(topic, existingContent, partNumber) {
  try {
    // Build adaptive prompt based on topic type
    const prompt = `Continue writing about "${topic}" - this is Part ${partNumber} of 4.

THE READER HAS ALREADY READ THIS:
---
${existingContent}
---

TOPIC-ADAPTIVE COVERAGE:
First, identify what type of topic "${topic}" is, then write the appropriate content for Part ${partNumber}.

**If it's a PERSON or GROUP (ninja, samurai, pirates, Einstein, etc.):**
- Part 2: What did they actually DO? Daily life, methods, skills, training, tools/weapons
- Part 3: Famous examples, key figures, major events, timeline of when they existed
- Part 4: Myths vs reality, pop culture depictions, modern legacy, why people still care

**If it's a CONCEPT or PHENOMENON (black holes, gravity, inflation, etc.):**
- Part 2: How does it WORK? The mechanics, the science, step-by-step explanation
- Part 3: Types/variations, discovery history, key scientists, major breakthroughs
- Part 4: Open questions, modern research, real-world applications, why it matters

**If it's an EVENT (French Revolution, moon landing, Titanic, etc.):**
- Part 2: Key players and factions, the buildup, what led to it
- Part 3: Timeline of major moments, turning points, what actually happened
- Part 4: Aftermath, what people get wrong, lasting impact, modern parallels

**If it's a THING or INVENTION (Roman concrete, printing press, iPhone, etc.):**
- Part 2: How was it made? The process, ingredients, engineering
- Part 3: Where/how it was used, famous examples, who made it
- Part 4: Why it matters, what it replaced, legacy, modern versions

**If it's a PLACE (Pompeii, Area 51, Amazon rainforest, etc.):**
- Part 2: What's actually there? Geography, layout, key features
- Part 3: History and major events that happened there
- Part 4: Modern status, why people visit/study it, mysteries remaining

NOW WRITE Part ${partNumber} using the appropriate focus for "${topic}".

READING LEVEL - CRITICAL:
Write for a 10-year-old. Use simple, everyday words. MAX 15 words per sentence.
- ❌ "subsequently" → ✅ "then"
- ❌ "commenced" → ✅ "started"
- ❌ "approximately" → ✅ "about"
- ❌ "demonstrate" → ✅ "show"
If you wouldn't say it to a kid, don't write it.

WRITING STYLE:
- Just tell the story. No analysis. No commentary.
- Short, punchy sentences. One idea per sentence.
- Active voice
- **Use past tense for historical events**
- 2-3 sentences per paragraph

GROUNDING FACTS - CRITICAL:
For every "wow" fact, ask: would someone who knows NOTHING about this understand WHY it's wow?
If not, add ONE sentence of context BEFORE the fact so it lands.

Structure: Setup (brief context) → Shocking fact → Let it breathe

❌ BAD: "The company lost $2 billion in a single day."
✅ GOOD: "Apple was worth $3 trillion. It lost $2 billion in a single day - more than most companies are worth."

START WITH A SECTION HEADER:
Use ## format, make it intriguing and relevant to what Part ${partNumber} covers for this topic type.

CRITICAL:
- Do NOT repeat information already covered
- Build on what came before - assume the reader remembers it
- Add NEW information, examples, quotes, connections
- Write 4-6 SHORT paragraphs (this is a continuation, not a full article)

HYPERLINKS - CRITICAL FORMAT:
Use EXACTLY [[double brackets]] around hyperlinks.
- 3-6 new hyperlinks in this section
- Link specific nouns (people, places, events, concepts)
- Full names: "[[Albert Einstein]]" not "[[Einstein]]"

BANNED WORDS/PHRASES:
❌ "contradiction", "unprecedented", "significance", "notably", "paradigm"
❌ "furthermore", "moreover", "however", "nevertheless", "consequently"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ Any sentence starting with "It was..." or "There was..."

Write Part ${partNumber} now:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = message.content[0].text;

    // Filter out generic/ambiguous hyperlinks (same as in generateArticleBody)
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

    // Fix quotation marks around hyperlinks
    content = content.replace(/"(\[\[[^\]]+\]\])"/g, '$1');
    content = content.replace(/'(\[\[[^\]]+\]\])'/g, '$1');
    content = content.replace(/"(\[\[[^\]]+\]\])/g, '$1');
    content = content.replace(/(\[\[[^\]]+\]\])"/g, '$1');
    content = content.replace(/'(\[\[[^\]]+\]\])/g, '$1');
    content = content.replace(/(\[\[[^\]]+\]\])'/g, '$1');

    // Extract hyperlinks
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    return { content, hyperlinks };
  } catch (error) {
    console.error('Error generating article continuation:', error);
    throw new Error('Failed to generate article continuation');
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
