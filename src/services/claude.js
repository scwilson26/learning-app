import Anthropic from '@anthropic-ai/sdk';
import { getWikipediaSubtopics, hasWikipediaMapping } from './wikipedia';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate just the hook/opening for an article (fast, ~1 sentence)
 * @param {string} topic - The topic to explore
 * @param {string} quickCardText - Optional Quick Card text to build upon
 * @param {Function} onChunk - Optional callback for streaming chunks
 * @returns {Promise<{hook: string}>}
 */
export async function generateArticleHook(topic, quickCardText = null, onChunk = null) {
  try {
    let prompt = `Write a ONE SENTENCE opening hook about "${topic}".

RULES:
- Under 15 words
- Simple everyday words (nothing fancy)
- Make them curious

EXAMPLES:

✅ GOOD:
"The Praetorian Guard murdered more emperors than they protected."
"Aboriginal songs can guide you 40,000 miles with no map."
"The Illuminati disbanded in 1785, but people still believe."

❌ BAD (too wordy):
"In a shadowy meeting of 12 intellectuals on May 1st, 1776..."

❌ NEVER say "Here's the hook" or any meta-commentary.

Write ONLY the hook - ONE sentence.`;

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

    // If streaming callback provided, use streaming
    if (onChunk) {
      let hookText = '';

      const stream = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          hookText += event.delta.text;
          onChunk(hookText);
        }
      }

      return { hook: hookText.trim() };
    } else {
      // Non-streaming fallback
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });

      return { hook: message.content[0].text.trim() };
    }
  } catch (error) {
    console.error('Error generating hook:', error);
    throw new Error('Failed to generate hook');
  }
}

/**
 * Generate the body of an article with streaming support
 * @param {string} topic - The topic to explore
 * @param {string} quickCardText - Optional Quick Card text that prompted this article
 * @param {Function} onChunk - Callback for streaming chunks (receives accumulated text)
 * @param {string[]} categoryIds - Optional array of category IDs to constrain suggestions
 * @returns {Promise<{content: string, hyperlinks: Array<string>, suggestions: Object}>}
 */
export async function generateArticleBody(topic, quickCardText = null, onChunk = null, categoryIds = null) {
  try {
    let prompt = `Write a SHORT overview of "${topic}". (Hook already written - just write body)

GOAL: After reading Part 1, the reader should think "OK, I understand WHAT this is."

This is an OVERVIEW, not a story. Explain what the topic is. Give them the basics.

FORMAT - CRITICAL:
You MUST use this exact format. Write 3 cards total (not including hook).

STRUCTURE FOR EACH CARD:
Each card should focus on ONE clear idea or concept. DRAMATICALLY VARY THE STRUCTURE AND LENGTH:
- Ultra-short cards (30-50 words) - ONE powerful fact, that's it
- Medium cards (60-90 words) - A bit more detail, but still tight
- Longer cards (100-130 words MAX) - Only when absolutely necessary for a complex idea

CRITICAL - MIX UP THE FORMAT WILDLY between cards:
- Card 1: Just ONE paragraph, no bullets at all
- Card 2: ALL bullets, no paragraph
- Card 3: One short sentence + 2-3 bullets
- NEVER use the same structure twice in a row
- NEVER start every card with a bolded sentence (vary it!)
- Some cards: Start with a question
- Some cards: Start with a surprising number or fact
- Some cards: Just tell it straight

IMPORTANT: Most cards should be SHORT (30-70 words). Only 1 card can be longer. Keep readers wanting more, not overwhelmed.

CRITICAL - MAKE EACH CARD SELF-CONTAINED AND SHAREABLE:
Each card must make sense if someone sees ONLY that card (like a screenshot). This means:
- Always mention the main topic by name in the card content - don't use vague pronouns like "it" or "they" without context
- Each card should be a complete thought, not half of an explanation
- Write punchy, intriguing card titles that make someone want to read
- Use concrete examples and specifics, not vague concepts
- Make it screenshot-worthy - lead with the most interesting/surprising angle
BUT cards in sequence should still build understanding - each adding a new layer so together they give a comprehensive overview.

CARD: Sky God of the Steppes
**Tengri was the supreme sky god worshipped across Central Asia for over a thousand years.** This wasn't some local deity - Tengri ruled the religious world from Mongolia to Turkey.

Nomadic tribes like the **Mongols, Turks, and Hungarians** all looked up at the endless blue sky and saw their chief god staring back:
- Controlled weather, fate, and the rise and fall of empires
- Name literally means "sky" or "heaven" in old Turkic languages
- When **Genghis Khan** conquered half the world, he claimed Tengri gave him permission

The steppe peoples believed everything - your success, your death, even which empires survived - came from the sky watching over you.

CARD: Master of Everything
**Imhotep was Pharaoh Djoser's right-hand man** around 2600 BC. Most people back then were lucky to master one skill. Imhotep did it all:
- Built the **first pyramid** (Step Pyramid at Saqqara)
- Practiced medicine and surgery
- Served as high priest
- Advised the pharaoh on literally everything

He was so impressive that after he died, Egyptians worshipped him for **2,000 years** as the god of medicine and wisdom. That's like if we made Steve Jobs a god today and people were still praying to him in the year 4000.

Rules - FOLLOW THESE:
- Write EXACTLY 3 cards - one focused concept per card
- Each card = one clear idea (don't jam multiple big concepts into one card)
- Make cards FULL - combine paragraphs and bullets, whatever it takes
- Use **bold** for key numbers, names, and dramatic facts
- CRITICAL: Each bullet must be on its own line with a line break after it
- Each card should have substantial content - don't be shy

WRITING STYLE:
Write like you're texting a friend. Simple words. Short sentences.

✅ Use: "started" "used" "showed" "found" "made"
❌ Don't use: "commenced" "utilized" "demonstrated" "facilitated"

BANNED:
❌ "What makes this fascinating..."
❌ "It's important to understand..."
❌ Don't repeat yourself

❌ BAD: "The ship carried 7 tons of gold."
✅ GOOD: "A single gold bar weighs 27 pounds. The ship carried 7 tons - enough to fill a school bus."

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
3. **NEVER hyperlink the topic itself or synonyms**:
   - If writing about "Africanized bee", do NOT link "[[Africanized bees]]", "[[African honeybees]]", "[[killer bees]]"
   - The reader is ALREADY reading about this topic - linking it is useless
   - Only link terms that take the reader to a DIFFERENT topic
4. **NEVER hyperlink GENERIC CONCEPTS or BASIC TERMS related to the topic**:
   - If writing about "Riemann Hypothesis", do NOT link "[[prime numbers]]", "[[zeta function]]", "[[mathematics]]"
   - If writing about "Roman aqueducts", do NOT link "[[water]]", "[[engineering]]", "[[stone]]"
   - Only link SPECIFIC people, places, or events with their own story: "[[Bernhard Riemann]]", "[[Aqua Claudia]]"

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

    let content = '';

    // Use streaming if onChunk callback is provided
    if (onChunk) {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }]
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          content += event.delta.text;
          onChunk(content);
        }
      }
    } else {
      // Non-streaming fallback
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }]
      });
      content = message.content[0].text;
    }

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
      /\[\[[A-Z][a-z]+ (researchers?|scientists?|studies?|team|professors?|experts?|engineers?|doctors?|officials?)\]\]/gi,
      // Generic math/science terms that are too broad
      /\[\[prime numbers?\]\]/gi,
      /\[\[mathematics?\]\]/gi,
      /\[\[zeta function\]\]/gi,
      /\[\[cryptography\]\]/gi,
      /\[\[water\]\]/gi,
      /\[\[engineering\]\]/gi,
      /\[\[stone\]\]/gi,
      /\[\[architecture\]\]/gi,
      // Generic astronomy/physics terms
      /\[\[supernova[es]?\]\]/gi,
      /\[\[Type I[abc]? supernova[es]?\]\]/gi,
      /\[\[Type II supernova[es]?\]\]/gi,
      /\[\[gamma-ray bursts?\]\]/gi,
      /\[\[neutron stars?\]\]/gi,
      /\[\[black holes?\]\]/gi,
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

    // Build category constraint for suggestions if categories are specified
    let categoryConstraint = '';
    if (categoryIds && categoryIds.length > 0 && categoryIds.length < Object.keys(TOPIC_CATEGORIES).length) {
      const categoryNames = categoryIds
        .filter(id => TOPIC_CATEGORIES[id])
        .map(id => TOPIC_CATEGORIES[id].name);
      categoryConstraint = `
CATEGORY CONSTRAINT - CRITICAL:
The user wants to stay within these topics: ${categoryNames.join(', ')}
ALL suggestions MUST fit within these categories. Do NOT suggest topics outside these areas.
`;
    }

    // Generate suggestions - 6 rabbit hole options
    const suggestionsPrompt = `Based on the article about "${topic}", suggest 6 rabbit holes.
${categoryConstraint}
MIX ACCESSIBILITY WITH DEPTH:
You need TWO types of suggestions:

TYPE 1 - "CROWD PLEASERS" (first 3):
Famous topics a curious teenager would recognize. Think "dinner party conversation" topics.
- Major historical events, famous people, well-known places
- Things people have HEARD of but don't know the full story

TYPE 2 - "DEEP CUTS" (last 3):
Specific, fascinating things that reward the curious.
- Lesser-known but story-worthy specifics from the article
- The kind of thing that makes someone say "wait, what's THAT?"

❌ BAD suggestions:
- Too obscure: "Karahan Tepe", "Antikythera Mechanism" (nobody knows these)
- Too generic: "Ancient History", "Science", "Technology" (boring)
- Too abstract: "Human Psychology", "Economic Systems" (no story)

✅ GOOD suggestions:
- Crowd pleasers: "Julius Caesar", "Ancient Egypt", "The Colosseum"
- Deep cuts: "Roman Concrete", "Praetorian Guard", "Hadrian's Wall"

RULES:
1. 1-4 words max per suggestion
2. First 3 = things most people have heard of
3. Last 3 = specific gems from the article that reward curiosity

Article context:
${content.substring(0, 500)}

Return ONLY a JSON object (no markdown):
{
  "related": ["Famous Topic 1", "Famous Topic 2", "Famous Topic 3"],
  "tangents": ["Specific Gem 1", "Specific Gem 2", "Specific Gem 3"]
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

    const prompt = `Write a SHORT article about "${topic}".

HOOK (1 sentence):
Start with something interesting. Under 15 words.

Example: "The Praetorian Guard murdered more emperors than they protected."

BODY (3-4 paragraphs):
Write like you're texting a friend. Simple words. Short sentences.

First paragraph: Why this matters
Middle paragraphs: Tell the story
Last paragraph: Leave one interesting question

❌ BAD: "The Dzungar Khanate controlled Central Asia for over a century, then picked a fight with the Qing Dynasty. What happened next was one of history's most complete genocides."
(You just told me the ending! Now why keep reading?)

✅ GOOD: Build chronologically. Start with what made them powerful, THEN reveal their downfall.
- Para 1: Why this matters (they dominated Central Asia)
- Para 2-3: What made them formidable (cavalry warfare, Silk Road control)
- Para 4: Their fatal mistake (picked fight with Qing)
- Para 5: The consequences (genocide)

Think like a storyteller, not a Wikipedia summary. Let the tension build.

WRITING QUALITY - CRITICAL:
You are a smart friend at a bar who just went down a Wikipedia rabbit hole and can't wait to share what you found.
Think: Malcolm Gladwell, Erik Larson, Mary Roach. Confident, a little irreverent, respects the reader's intelligence.

CORE PRINCIPLES:
1. **Lead with mystery, not thesis.** Make the reader feel the puzzle before explaining it.
2. **Front-load surprising details.** Weird fact, counterintuitive stat, vivid image—put it early.
3. **No throat-clearing.** Just say the thing. Don't announce what you're about to say.
4. **Earn conclusions, don't state them.** Show the evidence, let the reader feel the implication.
5. **Don't spoil the ending.** Build chronologically. Let tension build toward the climax.
6. **Rhetorical questions pull readers forward.** Use them to build tension, especially mid-section.

SENTENCE RHYTHM:
- Vary aggressively. Short punch. Medium explanation that breathes. Longer sentence that builds momentum.
- Stack facts like punches: "Isolated Amazon tribes. Arctic villages cut off for millennia. All of them invented language."
- If a sentence has two clauses, consider splitting it.
- Read it aloud - does it flow like conversation?

BANNED THROAT-CLEARING:
❌ "What makes this fascinating is..."
❌ "It's important to understand that..."
❌ "This demonstrates..."
❌ "The significance of this..."
❌ "One of the most interesting aspects..."
❌ "Then she did something no one had done..." (just tell me what she did)
❌ "But the real story was..." (just tell the real story)
Just start with the thing itself.

BANNED SETUP SENTENCES:
❌ Setup sentences that cushion the punch before delivering it
❌ "This was shocking." (if it's shocking, I'll know - show me)
❌ "Why does this matter? Because..." (just tell me why)
❌ Thesis statements: "The biggest empires fall when they get too greedy." (show it, don't state it)

BANNED REPETITION:
If a sentence restates the previous sentence in different words, DELETE one of them.
Never repeat information the reader already has. Trust that it landed.

BANNED WORDS (academic bloat):
❌ "subsequently", "utilized", "commenced", "facilitate", "demonstrate"
❌ "contradiction", "unprecedented", "significance", "notably", "paradigm"
❌ "furthermore", "moreover", "nevertheless", "consequently"
❌ "His brilliance lay in...", "The key was...", "This would prove to be..."
❌ "It was...", "There was..." (weak openers)
❌ "In other words...", "What this means is..." (trust the reader)

WRITING APPROACH:
- Show, don't tell. Don't say "he was brilliant"—show what he did.
- Trust the reader completely. They'll connect the dots. Don't explain your own sentences.
- No setup sentences that cushion the impact. Just throw the punch.
- Cut any sentence telling the reader how to feel.
- One strong sentence beats two medium ones. Be ruthless about cutting redundancy.
- End paragraphs with something that LANDS. Not a summary.
- Active voice. Past tense for history.
- Build tension constantly.

TONE EXAMPLES:
❌ BAD: "His brilliance lay in keeping the Continental Army alive through brutal winters"
✅ GOOD: "Washington kept the Continental Army alive through brutal winters. Nobody knows how."

❌ BAD: "The contradiction defined his entire life"
✅ GOOD: "Washington owned 300 slaves. Then he freed them all."

❌ BAD: "He turned retreat into an art form"
✅ GOOD: "Washington lost more battles than he won. He kept retreating. It worked."

PARAGRAPH STRUCTURE:
- 2-4 sentences per paragraph (vary length)
- Front-load the surprise
- Every paragraph must have something INTERESTING. No building paragraphs.
- If it could be half as long and still land, make it half as long.
- End with something that lands - not a transition or summary

PACING:
Setup is ONE or TWO sentences max, then hit the thing.
Get to the fascinating stuff immediately. No slow builds.

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
   - Generic institutional phrases like "Harvard researchers", "MIT scientists", "NASA engineers" (too vague - who specifically?)

4. **NEVER hyperlink GENERIC CONCEPTS or BASIC TERMS related to the topic**:
   - If writing about "Riemann Hypothesis", do NOT link "[[prime numbers]]", "[[zeta function]]", "[[mathematics]]"
   - If writing about "Roman aqueducts", do NOT link "[[water]]", "[[engineering]]", "[[stone]]"
   - Only link SPECIFIC people, places, or events with their own story: "[[Bernhard Riemann]]", "[[Aqua Claudia]]"`;

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
      // Generic math/science terms that are too broad
      /\[\[prime numbers?\]\]/gi,
      /\[\[mathematics?\]\]/gi,
      /\[\[zeta function\]\]/gi,
      /\[\[cryptography\]\]/gi,
      /\[\[water\]\]/gi,
      /\[\[engineering\]\]/gi,
      /\[\[stone\]\]/gi,
      /\[\[architecture\]\]/gi,
      // Generic astronomy/physics terms
      /\[\[supernova[es]?\]\]/gi,
      /\[\[Type I[abc]? supernova[es]?\]\]/gi,
      /\[\[Type II supernova[es]?\]\]/gi,
      /\[\[gamma-ray bursts?\]\]/gi,
      /\[\[neutron stars?\]\]/gi,
      /\[\[black holes?\]\]/gi,
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

WRITING STYLE:
- MAXIMUM 2 sentences. No more.
- Lead with the WEIRDEST, most shocking fact ABOUT "${term}"
- Write like you're texting a friend. Simple words. Short sentences.
- Use past tense for historical events
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
 * Wikipedia Vital Articles Level 4 categories
 * These contain ~10,000 of the most important/notable articles - the "crowd pleasers"
 */
export const TOPIC_CATEGORIES = {
  arts: {
    name: 'Arts',
    emoji: '🎨',
    page: 'Wikipedia:Vital_articles/Level/4/Arts',
  },
  biology: {
    name: 'Biology & Health',
    emoji: '🧬',
    page: 'Wikipedia:Vital_articles/Level/4/Biology_and_health_sciences',
  },
  everyday: {
    name: 'Everyday Life',
    emoji: '☕',
    page: 'Wikipedia:Vital_articles/Level/4/Everyday_life',
  },
  geography: {
    name: 'Geography',
    emoji: '🌍',
    page: 'Wikipedia:Vital_articles/Level/4/Geography',
  },
  history: {
    name: 'History',
    emoji: '📜',
    page: 'Wikipedia:Vital_articles/Level/4/History',
  },
  mathematics: {
    name: 'Mathematics',
    emoji: '🔢',
    page: 'Wikipedia:Vital_articles/Level/4/Mathematics',
  },
  people: {
    name: 'People',
    emoji: '👤',
    page: 'Wikipedia:Vital_articles/Level/4/People',
  },
  philosophy: {
    name: 'Philosophy & Religion',
    emoji: '🧘',
    page: 'Wikipedia:Vital_articles/Level/4/Philosophy_and_religion',
  },
  physics: {
    name: 'Physical Sciences',
    emoji: '⚛️',
    page: 'Wikipedia:Vital_articles/Level/4/Physical_sciences',
  },
  society: {
    name: 'Society',
    emoji: '🏛️',
    page: 'Wikipedia:Vital_articles/Level/4/Society_and_social_sciences',
  },
  technology: {
    name: 'Technology',
    emoji: '💻',
    page: 'Wikipedia:Vital_articles/Level/4/Technology',
  },
};

// For backwards compatibility
const VITAL_ARTICLE_PAGES = Object.values(TOPIC_CATEGORIES).map(c => c.page);

/**
 * Fetch random articles from Wikipedia's Vital Articles Level 4 list
 * These are ~10,000 of the most important articles - the "crowd pleasers"
 * @param {number} count - Number of random titles to fetch
 * @param {string[]} categoryIds - Optional array of category IDs to filter by (e.g., ['history', 'people'])
 * @returns {Promise<string[]>} Array of random Wikipedia article titles
 */
async function fetchRandomVitalArticles(count = 30, categoryIds = null) {
  try {
    // Get pages to fetch from (filtered by categories if specified)
    let pagesToUse = VITAL_ARTICLE_PAGES;
    if (categoryIds && categoryIds.length > 0) {
      pagesToUse = categoryIds
        .filter(id => TOPIC_CATEGORIES[id])
        .map(id => TOPIC_CATEGORIES[id].page);
    }

    if (pagesToUse.length === 0) {
      pagesToUse = VITAL_ARTICLE_PAGES; // Fallback to all if no valid categories
    }

    // Pick a random sub-page to fetch from
    const randomPage = pagesToUse[Math.floor(Math.random() * pagesToUse.length)];

    // Fetch article links from that page
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(randomPage)}&prop=links&format=json&origin=*`
    );
    const data = await response.json();

    if (!data.parse?.links) {
      throw new Error('Failed to parse Wikipedia response');
    }

    // Filter to only article namespace (ns=0) and extract titles
    const articles = data.parse.links
      .filter(link => link.ns === 0)
      .map(link => link['*']);

    if (articles.length === 0) {
      throw new Error('No articles found');
    }

    // Shuffle and pick random subset
    const shuffled = articles.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Error fetching vital articles:', error);
    // Fallback to random Wikipedia if vital articles fail
    return fetchRandomWikipediaTitles(count);
  }
}

/**
 * Fallback: Fetch random Wikipedia article titles (pure random)
 * @param {number} count - Number of random titles to fetch
 * @returns {Promise<string[]>} Array of random Wikipedia article titles
 */
async function fetchRandomWikipediaTitles(count = 10) {
  // Fetch multiple random articles in parallel
  const fetches = Array(count).fill(null).map(() =>
    fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary')
      .then(res => res.json())
      .then(data => data.title)
      .catch(() => null)
  );

  const results = await Promise.all(fetches);
  return results.filter(title => title !== null);
}

/**
 * Generate a random surprising topic using Wikipedia + Claude hybrid approach
 * Fetches random Wikipedia titles and has Claude pick the most fascinating one
 * @param {string[]} categoryIds - Optional array of category IDs to filter by
 * @returns {Promise<string>} A fascinating topic to explore
 */
export async function generateSurpriseTopic(categoryIds = null) {
  try {
    // Fetch 30 random titles from Wikipedia's Vital Articles (curated notable articles)
    const wikipediaTitles = await fetchRandomVitalArticles(30, categoryIds);

    if (wikipediaTitles.length === 0) {
      throw new Error('Failed to fetch Wikipedia titles');
    }

    // Get recent topics to avoid
    const recentTopics = getRecentTopics();
    const avoidList = recentTopics.length > 0
      ? `\n\nDO NOT pick any of these (already shown recently):\n${recentTopics.slice(0, 40).join(', ')}`
      : '';

    const prompt = `Here are ${wikipediaTitles.length} random Wikipedia article titles:

${wikipediaTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Pick the ONE that would make the most fascinating, surprising article to read about. Consider:
- Which has the most "wait, what?!" factor
- Which would make someone curious to learn more
- Which is unusual or unexpected

RULES:
1. Pick from the list above - don't make up your own topic
2. Return ONLY the exact title as written (you can shorten overly long titles)
3. Skip anything boring, generic, or too technical${avoidList}

If none are good, pick the least boring one. Return ONLY the topic name.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0.7,
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
 * Generate article continuation (Part 2, 3, or 4) with streaming support
 * @param {string} topic - The topic being explored
 * @param {string} existingContent - All content generated so far (hook + body + any continuations)
 * @param {number} partNumber - Which part we're generating (2, 3, or 4)
 * @param {Function} onChunk - Callback for streaming chunks (receives accumulated text)
 * @returns {Promise<{content: string, hyperlinks: Array<string>}>}
 */
export async function generateArticleContinuation(topic, existingContent, partNumber, onChunk = null) {
  try {
    // Build adaptive prompt based on topic type
    const prompt = `Continue writing about "${topic}" - this is Part ${partNumber} of 4.

THE READER HAS ALREADY READ THIS:
---
${existingContent}
---

GOAL FOR PARTS 2-4:
By the end of Part 4, the reader should feel complete. Like "OK, I understand this topic - I can move on now."

They shouldn't think "Wait, there's got to be more? This feels incomplete." Make sure the obvious essentials are covered.

PLANNING YOUR COVERAGE:
Before writing Part ${partNumber}, think: "What are the 3-4 most important things someone needs to know about ${topic} to feel like they got the complete core story?"

Don't follow a rigid formula. Think about THIS specific topic:
- What would someone obviously want to know?
- What's missing that would make this feel incomplete?
- By Part 4, have we covered the essential angles?

Examples of thinking through a topic:

**Bonobos**: What is it? (Part 1 ✓). Still need: Where do they live? Why are they special/different from other apes? Conservation status? Social behavior details? → Cover these across Parts 2-4.

**Ballista**: What is it? (Part 1 ✓). Still need: How does it actually work? Why did Romans use it? Famous uses? Why did it stop being used? → Cover these across Parts 2-4.

**Christina of Sweden**: Who was she? (Part 1 ✓). Still need: Her major decisions as queen? The abdication (seems major)? What happened after? Why does she matter? → Cover these across Parts 2-4.

For Part ${partNumber} specifically, pick ONE of those essential angles that hasn't been covered yet.

NOW WRITE Part ${partNumber} for "${topic}".

CRITICAL: Make a smooth transition!
- Read how Part 1 ended
- Your header should connect to that naturally
- Then dive into the new Part ${partNumber} content

Example:
Part 1 ends: "...only 15,000 left in the wild. What happens when they disappear?"
Part 2 Header: "Why They're Disappearing" ✅ (flows naturally)
NOT: "How Bonobos Actually Live" ❌ (jarring jump)

FORMAT - CRITICAL:
You MUST use this exact format. Write 2-3 cards total.

STRUCTURE FOR EACH CARD:
DRAMATICALLY VARY THE STRUCTURE AND LENGTH to keep it fresh and unpredictable:
- Ultra-short cards (30-50 words) - ONE powerful fact, that's it
- Medium cards (60-90 words) - A bit more detail, but still tight
- Longer cards (100-130 words MAX) - Only when absolutely necessary for a complex idea

CRITICAL - MIX UP THE FORMAT WILDLY between cards:
- Some cards: Just ONE paragraph, no bullets at all
- Some cards: ALL bullets, no paragraph
- Some cards: One short sentence + 2-3 bullets
- NEVER use the same structure twice in a row
- NEVER start every card with a bolded sentence (vary it!)
- Some cards: Start with a question
- Some cards: Start with a surprising number or fact
- Some cards: Just tell it straight

IMPORTANT: Most cards should be SHORT (30-70 words). Only 1 card per part can be longer. Keep readers wanting more, not overwhelmed.

CRITICAL - MAKE EACH CARD SELF-CONTAINED AND SHAREABLE:
Each card must make sense if someone sees ONLY that card (like a screenshot). This means:
- Always mention the main topic by name in the card content - don't use vague pronouns like "it" or "they" without context
- Each card should be a complete thought, not half of an explanation
- Write punchy, intriguing card titles that make someone want to read
- Use concrete examples and specifics, not vague concepts
- Make it screenshot-worthy - lead with the most interesting/surprising angle
BUT cards in sequence should still build understanding - each adding a new layer so together they give a comprehensive overview.

CARD: Training Regimen
Roman soldiers trained **every single day** from sunrise to sunset. The training was designed to make actual combat feel easy by comparison.

The daily routine was brutal:
- March **20 miles** in full armor carrying 60 pounds of gear
- Build a fortified camp every single night (dig trenches, set up walls)
- Practice with wooden swords **twice as heavy** as real ones
- Drill formations until every movement was automatic

They did this for **years** before ever seeing real battle. By the time they faced an enemy, their bodies were machines and their minds knew exactly what to do.

CARD: Daily Battles
They didn't just train - they fought each other in mock battles with real consequences:
- Losers got reduced rations for the week
- Officers watched every single move and noted mistakes
- Bad soldiers got extra duty shifts or even worse food
- Winners earned respect, better positions, and recommendations for promotion

The competition was intense. Every soldier knew his performance was being judged constantly. It kept everyone sharp and ready.

Rules - FOLLOW THESE:
- Write EXACTLY 3 cards - one focused concept per card
- Each card = one clear idea (don't jam multiple big concepts into one card)
- Make cards FULL - combine paragraphs and bullets, whatever it takes
- Use **bold** for key numbers, names, and dramatic facts
- CRITICAL: Each bullet must be on its own line with a line break after it
- Each card should have substantial content - don't be shy

WRITING RULES:
- Don't repeat what you already said
- Cover the Part ${partNumber} content from the guide above
- ✅ Use: "started" "used" "showed"
- ❌ Don't use: "commenced" "utilized" "demonstrated"

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

    let content = '';

    // Use streaming if onChunk callback is provided
    if (onChunk) {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          content += event.delta.text;
          onChunk(content);
        }
      }
    } else {
      // Non-streaming fallback
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      });
      content = message.content[0].text;
    }

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
 * Generate study cards (titles) for a deck topic with tier support
 * @param {string} deckName - The name of the deck (e.g., "Ancient Egypt", "Ancient Rome")
 * @param {string} parentContext - Optional parent deck name for context (e.g., "History > Ancient World")
 * @param {number} cardCount - Number of cards to generate (default 5)
 * @param {string} tier - Card tier: 'core' | 'deep_dive_1' | 'deep_dive_2'
 * @param {string[]} previousTierTitles - Titles from previous tiers to avoid repetition
 * @returns {Promise<Array<{id: string, title: string}>>} Array of card objects with ids and titles
 */
export async function generateDeckCards(deckName, parentContext = null, cardCount = 5, tier = 'core', previousTierTitles = []) {
  try {
    const contextHint = parentContext
      ? `This is the "${deckName}" deck, which is inside "${parentContext}".`
      : `This is the "${deckName}" deck.`;

    // Build example output based on card count
    const exampleTitles = Array.from({ length: cardCount }, (_, i) => `"Title ${i + 1}"`).join(', ');

    // Build "already covered" context from previous tiers
    const alreadyCoveredHint = previousTierTitles.length > 0
      ? `\n⚠️ ALREADY COVERED (do NOT repeat these topics or facts):
${previousTierTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Your new cards must cover DIFFERENT aspects - no overlap with the above!\n`
      : '';

    // Tier-specific instructions - topic-aware, not template-based
    const tierInstructions = {
      core: `TIER: CORE (5 cards)
These cards answer the OBVIOUS questions anyone would ask about "${deckName}".
After reading these 5 cards, the reader should think: "OK, I get what ${deckName} is."

🚨 CARD 1 MUST BE THE GROUNDING CARD:
- Title: Just "${deckName}" (the topic name itself, nothing fancy)
- This card orients the reader: "What is this? Why should I care?"
- Content will explain what it is + hook them to keep reading

Cards 2-5: Now you can use specific, surprising hook titles.

Think: What would someone who knows NOTHING about this want to know first?
- Card 1 grounds them, cards 2-5 go deeper with interesting angles
- Include at least one "wait, really?!" surprising fact to hook them

CRITICAL: Each card must cover a DISTINCT aspect. No two cards should overlap.`,

      deep_dive_1: `TIER: DEEP DIVE 1 (5 cards)
These cards answer the "okay, but HOW/WHY?" follow-up questions.
The reader already knows the basics from Core cards.

Think: What would a curious person ask next?
- How does it actually work? What are the key parts/people/events?
- What's the cause and effect? What are the types/variations?

CRITICAL: Go DEEPER, not sideways. Build on what Core covered, don't repeat it.`,

      deep_dive_2: `TIER: DEEP DIVE 2 (5 cards)
These cards answer questions only a REALLY curious person would think to ask.
The reader is now engaged and wants the deep stuff.

Think: What would impress someone who already knows this topic?
- The controversies, debates, edge cases
- Recent discoveries, surprising connections, obscure details
- The "I had no idea!" facts that even enthusiasts might not know

CRITICAL: Find the OBSCURE stuff. The reader has already learned 10 cards worth.`
    };

    const prompt = `Generate exactly ${cardCount} card titles for "${deckName}".
${alreadyCoveredHint}

${contextHint}

${tierInstructions[tier] || tierInstructions.core}

IMPORTANT: Don't follow a rigid template. Figure out what THIS specific topic needs.
- "${deckName}" might be a person, place, event, concept, or thing
- The questions that need answering are DIFFERENT for each type
- By the end of all 15 cards, the reader should understand "${deckName}" like they read a good Wikipedia article (but more fun)

TITLE FORMULA: [Specific Topic Element] + [Hook/Tension]
Every title must hint at something SPECIFIC you'll learn.

❌ BANNED - Generic/vague titles:
- "Understanding ${deckName}"
- "The History of ${deckName}"
- "Why ${deckName} Matters"
- "How ${deckName} Works"
- "The Basics of..."
- Any title that could apply to 100 different topics

✅ GREAT TITLES (notice: specific + intriguing):
- "The Blind Mathematician Who Outworked Everyone"
- "Why There's No Nobel Prize for Math"
- "Solved in 358 Years"
- "The 6-Second Rule That Saved Apollo 11"
- "When Salt Was Worth More Than Gold"

Each title MUST:
1. Include a SPECIFIC element (number, name, date, place, object)
2. Create tension or curiosity - "wait, what?!"
3. Be 4-10 words
4. Only make sense for "${deckName}" (not generic)
5. Promise a story or revelation, not a lecture

Return ONLY a JSON array with exactly ${cardCount} titles, no explanation:
[${exampleTitles}]`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text.trim();
    // Parse JSON array, handling potential markdown code blocks
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    let titles = JSON.parse(jsonText);

    // For Core tier, force Card 1 to be the deck name with a hook subtitle
    if (tier === 'core' && titles.length > 0) {
      // Generate a short hook/subtitle for the grounding card
      const hookMessage = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Write a 3-6 word hook/subtitle for "${deckName}" that makes someone curious.

Examples:
- "Ceramic Art" → "26,000 Years of Mud and Fire"
- "Augustus" → "The Teenager Who Became Rome"
- "Solidarity" → "When Workers Toppled an Empire"
- "Black Holes" → "Where Physics Breaks Down"

Return ONLY the hook, no quotes, no explanation.`
        }]
      });
      const hook = hookMessage.content[0].text.trim().replace(/^["']|["']$/g, '');
      titles[0] = `${deckName}: ${hook}`;
    }

    // Convert to card objects with generated IDs (include tier in ID for uniqueness)
    const tierSuffix = tier === 'core' ? '' : `-${tier.replace('_', '')}`;
    return titles.map((title, index) => ({
      id: `${deckName.toLowerCase().replace(/\s+/g, '-')}${tierSuffix}-${index + 1}-${Date.now()}`,
      title
    }));
  } catch (error) {
    console.error('Error generating deck cards:', error);
    throw new Error('Failed to generate deck cards');
  }
}

/**
 * Generate sub-decks for a topic (for infinite depth exploration)
 * Uses Wikipedia API first for real topic names, falls back to AI generation
 * @param {string} deckName - The name of the current deck (e.g., "Ancient Egypt")
 * @param {string} parentPath - The path to this deck (e.g., "History > Ancient World")
 * @param {number} depth - How deep we are (2 = sub-category, 3+ = dynamic)
 * @returns {Promise<Array<{id: string, name: string, emoji: string}> | null>} Array of sub-deck objects, or null if this is a leaf
 */
export async function generateSubDecks(deckName, parentPath = null, depth = 2, userArchetype = null) {
  try {
    // Build the full breadcrumb path for context
    const fullPath = parentPath ? `${parentPath} → ${deckName}` : deckName

    // Convert deck name to a potential ID for Wikipedia lookup
    const deckId = deckName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')

    // TRY WIKIPEDIA FIRST (for depth 2+)
    // This allows section-based Level 2 decks to get Wikipedia topics
    if (depth >= 2) {
      console.log(`[generateSubDecks] Trying Wikipedia for: ${deckName} (depth ${depth})`)
      const wikiResults = await getWikipediaSubtopics(deckId, deckName, parentPath)

      if (wikiResults && wikiResults.length >= 3) {
        console.log(`[generateSubDecks] Wikipedia returned ${wikiResults.length} results for: ${deckName}`)
        return wikiResults
      }
      console.log(`[generateSubDecks] Wikipedia didn't have good results, falling back to AI`)
    }

    // FALL BACK TO AI GENERATION
    // Build archetype hint if available
    let archetypeHint = ''
    if (userArchetype) {
      const archetypePreferences = {
        'lorekeeper': 'Focus on stories, histories, people, and narratives. The user loves rich backstories and legends.',
        'pattern-seeker': 'Focus on systems, relationships, cause-and-effect, and underlying patterns. The user loves understanding how things connect.',
        'tinkerer': 'Focus on how things work, construction, mechanics, and hands-on aspects. The user loves understanding the "how".',
        'explorer': 'Focus on discovery, geography, journeys, and lesser-known facts. The user loves venturing into unfamiliar territory.',
        'philosopher': 'Focus on ideas, meaning, ethics, and deeper questions. The user loves pondering the "why".',
      }
      archetypeHint = archetypePreferences[userArchetype]
        ? `\nUSER PREFERENCE: ${archetypePreferences[userArchetype]}\n`
        : ''
    }

    // Build depth-specific guidance
    let depthGuidance = ''
    let shouldBeLeafHint = ''

    if (depth <= 2) {
      depthGuidance = `At Level ${depth}, this is still a BROAD category. Generate 8-10 diverse sub-topics. Almost all Level 2 topics should have sub-topics.`
    } else if (depth === 3) {
      depthGuidance = `At Level ${depth}, this is a sub-category. Generate 6-8 sub-topics if this topic has multiple distinct aspects worth exploring.`
    } else if (depth === 4) {
      depthGuidance = `At Level ${depth}, topics are getting specific. Generate 4-6 sub-topics if genuinely divisible, OR mark as a leaf if it's focused enough.`
    } else if (depth === 5) {
      depthGuidance = `At Level ${depth}, most topics should be LEAVES. Only generate 3-5 sub-topics if "${deckName}" is genuinely rich with multiple distinct aspects. Otherwise, return an empty array.`
      shouldBeLeafHint = `\n⚠️ STRONG PREFERENCE FOR LEAF: At this depth, err on the side of making "${deckName}" a leaf unless it's clearly a broad topic.`
    } else {
      depthGuidance = `At Level ${depth}, this topic SHOULD almost certainly be a LEAF. Only generate sub-topics in exceptional cases where "${deckName}" is surprisingly broad (like a major historical era or entire field). In 90% of cases, return an empty array.`
      shouldBeLeafHint = `\n🛑 VERY LIKELY A LEAF: Depth ${depth} is very deep. "${deckName}" should almost certainly be a leaf unless it's exceptionally broad.`
    }

    const prompt = `You are generating sub-topics for a knowledge learning app.

FULL PATH: ${fullPath}
CURRENT TOPIC: "${deckName}"
DEPTH LEVEL: ${depth}
${parentPath ? `PARENT CONTEXT: "${parentPath.split(' > ').pop() || parentPath}" is the broader category containing "${deckName}"` : 'This is a top-level category.'}
${archetypeHint}
═══════════════════════════════════════════════════════════════
${depthGuidance}${shouldBeLeafHint}
═══════════════════════════════════════════════════════════════

🚨 CRITICAL: Generate SPECIFIC topics, NOT meta-categories or groupings!

Each sub-topic MUST be:
- A SPECIFIC person, place, thing, event, or concept with a PROPER NAME
- Something someone would actually search for or click on Wikipedia
- Exciting and recognizable - things people have heard of or want to learn about

❌ NEVER generate topics like:
- "Old Kingdom Influential Rulers" → ❌ This is a meta-category
- "Female Pharaohs of Significance" → ❌ This is an abstract grouping
- "Notable Building Projects" → ❌ This is a textbook chapter heading
- "Types of X" or "Categories of Y" → ❌ Academic abstractions
- "Important Figures" or "Key Events" → ❌ Generic groupings

✅ ALWAYS generate topics like:
- "Cleopatra" → ✅ Specific person
- "Tutankhamun" → ✅ Specific person
- "The Great Pyramid of Giza" → ✅ Specific place/thing
- "The Rosetta Stone" → ✅ Specific artifact
- "Battle of Kadesh" → ✅ Specific event

EXAMPLES OF GOOD VS BAD:

For "Notable Pharaohs":
❌ BAD: "Old Kingdom Rulers", "Female Pharaohs", "Warrior Pharaohs", "Religious Pharaohs"
✅ GOOD: "Cleopatra", "Tutankhamun", "Ramses II", "Hatshepsut", "Akhenaten", "Nefertiti"

For "Ancient Egypt Architecture":
❌ BAD: "Monumental Architecture", "Religious Structures", "Tomb Construction"
✅ GOOD: "Great Pyramid of Giza", "The Sphinx", "Valley of the Kings", "Karnak Temple", "Abu Simbel"

For "World War II Battles":
❌ BAD: "European Theater Battles", "Pacific Campaigns", "Turning Point Battles"
✅ GOOD: "D-Day (Normandy)", "Battle of Stalingrad", "Battle of Midway", "Battle of the Bulge"

For "Renaissance Artists":
❌ BAD: "Italian Masters", "Northern Renaissance Painters", "Sculpture Artists"
✅ GOOD: "Leonardo da Vinci", "Michelangelo", "Raphael", "Botticelli", "Donatello"

WHEN TO MAKE IT A LEAF (return empty subDecks array):
- The topic is ALREADY a specific person, place, thing, or event
- It's a single concept that 5 cards would cover well
- It feels like a Wikipedia ARTICLE (not a category page)
- Examples: "Cleopatra", "The Great Pyramid", "Battle of Thermopylae"

${depth >= 4 ? `At depth ${depth}, prefer making "${deckName}" a LEAF unless it genuinely contains multiple famous specific things inside it.` : ''}

Return ONLY valid JSON (no markdown, no explanation):

If generating sub-topics:
{"subDecks": [{"id": "kebab-case-id", "name": "Display Name", "emoji": "🎯"}, ...], "isLeaf": false}

If this is a leaf topic:
{"subDecks": [], "isLeaf": true}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text.trim();
    // Parse JSON, handling potential markdown code blocks
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const result = JSON.parse(jsonText);

    // Return null for leaf decks, array for decks with children
    if (!result.subDecks || result.subDecks.length === 0) {
      return null; // This is a leaf deck
    }

    // Normalize the sub-deck data
    const normalizedDecks = result.subDecks.map(deck => ({
      id: deck.id || deck.name.toLowerCase().replace(/\s+/g, '-'),
      name: deck.name || deck.title,
      emoji: deck.emoji || deck.icon || '📄'
    }));

    // Validate and filter out bad sub-decks
    const parentName = deckName.toLowerCase()
    const pathParts = (parentPath || '').toLowerCase().split(' > ')

    const validatedDecks = normalizedDecks.filter(deck => {
      const name = deck.name.toLowerCase()

      // Filter out generic/bad names
      const badNames = ['introduction', 'overview', 'basics', 'other', 'miscellaneous', 'general', 'more']
      if (badNames.some(bad => name === bad || name.includes(bad))) {
        return false
      }

      // Filter out duplicates of parent
      if (name === parentName || name.includes(parentName) && name.length < parentName.length + 5) {
        return false
      }

      // Filter out if same as any ancestor in path
      if (pathParts.some(part => part && (name === part || part === name))) {
        return false
      }

      return true
    })

    // Remove duplicate names within the results
    const seenNames = new Set()
    const uniqueDecks = validatedDecks.filter(deck => {
      const key = deck.name.toLowerCase()
      if (seenNames.has(key)) {
        return false
      }
      seenNames.add(key)
      return true
    })

    return uniqueDecks.length > 0 ? uniqueDecks : null;
  } catch (error) {
    console.error('Error generating sub-decks:', error);
    throw new Error('Failed to generate sub-decks');
  }
}

/**
 * Generate a narrative outline for all 15 cards in a deck
 * This ensures no repetition by planning all cards together upfront
 * @param {string} deckName - The name of the deck
 * @param {boolean} hasChildren - Whether this deck has subtopics
 * @param {string[]} childrenNames - Names of child topics (if any)
 * @param {string} parentPath - Optional parent context path (e.g., "Technology > Manufacturing & Industrial Technology")
 * @returns {Promise<Object>} The outline with narrative_arc and cards array
 */
export async function generateNarrativeOutline(deckName, hasChildren = false, childrenNames = [], parentPath = null) {
  console.log(`[OUTLINE] Generating narrative outline for: ${deckName}${parentPath ? ` (within ${parentPath})` : ''}`);

  const childrenContext = hasChildren && childrenNames.length > 0
    ? `
IMPORTANT: This topic has subtopics (${childrenNames.join(', ')}).
- Don't deep-dive into subtopics - they have their own cards
- Focus on the overview and connecting ideas
- Each card should illuminate a different angle of "${deckName}" itself
`
    : `
This is a leaf topic - cover it comprehensively across all 15 cards.
`;

  // Build parent context hint if we have a parent path
  const parentContextHint = parentPath
    ? `\nCONTEXT: This is "${deckName}" within the broader topic of "${parentPath}".
All cards MUST be relevant to this parent context. For example, if this is "Other Topics" within "Manufacturing & Industrial Technology", the cards should cover manufacturing/industrial topics that don't fit other categories - NOT generic philosophical topics.\n`
    : '';

  const outlinePrompt = `You are creating a learning experience about: "${deckName}"${parentPath ? ` (within ${parentPath})` : ''}
${parentContextHint}
Your task: Generate a narrative outline for 15 cards that tells the COMPLETE story with ZERO repetition.

CRITICAL RULES:
1. Each card MUST cover a COMPLETELY DIFFERENT aspect
2. NO overlap between cards whatsoever
3. Each card must be self-contained (shareable on social media alone)
4. Together, the 15 cards tell the full story from beginning to end
5. Cards should flow logically (like chapters in a book)
${childrenContext}

CARD STRUCTURE:
- Cards 1-5: CORE (the basics - what is it, why it matters, key facts)
- Cards 6-10: DEEP DIVE 1 (how it works, key players, mechanisms)
- Cards 11-15: DEEP DIVE 2 (surprising details, controversies, lesser-known facts)

RESPONSE FORMAT (JSON):
{
  "narrative_arc": "One sentence describing the overall story flow",
  "cards": [
    {
      "number": 1,
      "title": "Compelling card title with hook",
      "focus": "What THIS specific card covers",
      "key_points": ["Specific fact 1", "Specific fact 2", "Specific fact 3"],
      "excludes": "What NOT to mention (covered elsewhere)"
    }
  ]
}

EXAMPLE (for "Ancient Rome"):
{
  "narrative_arc": "Rome's evolution from village to empire, focusing on key turning points",
  "cards": [
    {
      "number": 1,
      "title": "Ancient Rome: From Mud Huts to World Empire",
      "focus": "Overview - what was Rome and why it matters",
      "key_points": ["753 BCE to 476 CE", "Mediterranean dominance", "Legal/cultural legacy"],
      "excludes": "Specific wars, emperors (later cards)"
    },
    {
      "number": 2,
      "title": "The She-Wolf Legend: Rome's Violent Birth",
      "focus": "Founding myth with Romulus and Remus",
      "key_points": ["Wolf nursed twins", "Romulus kills Remus", "753 BCE founding"],
      "excludes": "Republic era (card 3), later history"
    },
    {
      "number": 3,
      "title": "Overthrowing Kings: Birth of the Republic",
      "focus": "Transition from monarchy to representative government",
      "key_points": ["509 BCE revolution", "Senate and consuls", "Tarquin's exile"],
      "excludes": "Founding legend (card 2), wars (cards 4-5)"
    }
  ]
}

Now generate the complete 15-card outline for: "${deckName}"
Return ONLY valid JSON, no other text.`;

  try {
    // Use Haiku for speed - outline is just planning structure, not content
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: outlinePrompt }]
    });

    const outlineText = message.content[0].text;

    // Parse JSON from response (handle markdown code blocks if present)
    const jsonMatch = outlineText.match(/\{[\s\S]*\}/);
    const outline = JSON.parse(jsonMatch ? jsonMatch[0] : outlineText);

    console.log(`[OUTLINE] Generated outline with ${outline.cards.length} cards`);
    return outline;

  } catch (error) {
    console.error('[OUTLINE] Error generating outline:', error);
    throw error;
  }
}

/**
 * Generate content for a single card based on the narrative outline
 * @param {number} cardNumber - Card number (1-15)
 * @param {string} deckName - The deck name
 * @param {Object} outline - The narrative outline from generateNarrativeOutline
 * @returns {Promise<{id: string, title: string, content: string}>}
 */
export async function generateCardFromOutline(cardNumber, deckName, outline) {
  console.log(`[CARD ${cardNumber}] Generating based on outline...`);

  const thisCard = outline.cards[cardNumber - 1]; // Arrays are 0-indexed
  const otherCards = outline.cards
    .filter((_, i) => i !== cardNumber - 1)
    .map(c => `Card ${c.number}: ${c.focus}`)
    .join('\n');

  const cardPrompt = `You are generating Card ${cardNumber} of 15 about: "${deckName}"

OVERALL STORY ARC:
${outline.narrative_arc}

THIS CARD'S ASSIGNMENT:
Title: "${thisCard.title}"
Focus: ${thisCard.focus}
Key Points: ${thisCard.key_points.join(', ')}
DO NOT MENTION: ${thisCard.excludes}

OTHER CARDS (to avoid repetition):
${otherCards}

REQUIREMENTS:
1. Write 60-80 words of engaging content
2. Make it shareable - someone should understand it even if they only see this card
3. Include specific facts, numbers, names where relevant
4. Use vivid, memorable language
5. NO overlap with any other card's content
6. Focus ONLY on this card's assigned topic

TONE: Engaging, surprising, conversational (not academic/dry)

Generate the card content now (text only, no title - that's already assigned).`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: cardPrompt }]
    });

    const content = message.content[0].text.trim();

    console.log(`[CARD ${cardNumber}] Generated: ${content.slice(0, 50)}...`);

    // Determine tier from card number
    let tier = 'core';
    if (cardNumber > 10) tier = 'deep_dive_2';
    else if (cardNumber > 5) tier = 'deep_dive_1';

    const tierSuffix = tier === 'core' ? '' : `-${tier.replace('_', '')}`;
    const tierIndex = tier === 'core' ? cardNumber : (tier === 'deep_dive_1' ? cardNumber - 5 : cardNumber - 10);

    return {
      id: `${deckName.toLowerCase().replace(/\s+/g, '-')}${tierSuffix}-${tierIndex}-${Date.now()}`,
      title: thisCard.title,
      content: content,
      tier: tier,
      tierIndex: tierIndex - 1 // 0-indexed within tier
    };

  } catch (error) {
    console.error(`[CARD ${cardNumber}] Error:`, error);
    throw error;
  }
}

/**
 * Generate a single tier of cards (5 cards) with specific focus
 * @param {string} deckName - The deck name
 * @param {Object} config - Tier configuration
 * @param {string} parentPath - Optional parent context
 * @returns {Promise<Array>} Array of 5 card objects
 */
async function generateTier(deckName, config, parentPath = null) {
  const parentContext = parentPath
    ? `\nCONTEXT: This is "${deckName}" within "${parentPath}". All cards MUST be relevant to this parent context.\n`
    : '';

  const prompt = `Generate ${config.cardNumbers.length} learning cards about: "${deckName}"
${parentContext}
TIER: ${config.tierName}
CARD NUMBERS: ${config.cardNumbers.join(', ')}

YOUR FOCUS FOR THIS TIER:
${config.focus}

TONE: ${config.tone}

WHAT TO AVOID (covered in other tiers):
${config.avoidTopics}

CRITICAL RULES:
1. Each card MUST cover a COMPLETELY DIFFERENT aspect
2. NO two cards should repeat information
3. Make each card self-contained (shareable on social media alone)
4. Stay focused on this tier's theme
5. Use specific facts, numbers, names - not vague statements
6. Card 1 title MUST be "${deckName}: [short hook]" to orient readers

CARD STRUCTURE:
- Title: Compelling, specific, makes them want to read (4-10 words)
- Content: 60-100 words, conversational, memorable, fact-dense

RETURN ONLY VALID JSON (no markdown, no explanation):
{
  "cards": [
    {
      "number": ${config.cardNumbers[0]},
      "title": "Specific compelling title",
      "content": "60-100 words of engaging content with specific facts"
    }
  ]
}

Generate exactly ${config.cardNumbers.length} cards now:`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;

    // Parse JSON (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.cards || !Array.isArray(result.cards)) {
      throw new Error('Invalid card structure in response');
    }

    // Transform to our card format
    return result.cards.map((card, index) => ({
      id: `${deckName.toLowerCase().replace(/\s+/g, '-')}-${config.tier}-${index}-${Date.now()}`,
      title: card.title,
      content: card.content,
      tier: config.tier,
      tierIndex: index
    }));

  } catch (error) {
    console.error(`[TIER] Error generating ${config.tierName}:`, error);
    throw error;
  }
}

/**
 * Generate all 15 cards for a deck using PARALLEL tier generation with PROGRESSIVE loading
 * Fires 3 API calls simultaneously, calls onTierComplete as each tier finishes
 * @param {string} deckName - The deck name
 * @param {boolean} hasChildren - Whether this deck has subtopics (unused but kept for API compat)
 * @param {string[]} childrenNames - Names of child topics (unused but kept for API compat)
 * @param {Function} onTierComplete - Callback when a tier completes: (tierName, cards) => void
 * @param {string} parentPath - Optional parent context path (e.g., "Technology > Manufacturing")
 * @returns {Promise<{cards: Array, cardsByTier: Object}>}
 */
export async function generateAllCardsWithOutline(deckName, hasChildren = false, childrenNames = [], onTierComplete = null, parentPath = null) {
  console.log(`[CARDS] Generating 15 cards in PARALLEL for: ${deckName}${parentPath ? ` (within ${parentPath})` : ''}`);

  const cardsByTier = {
    core: null,
    deep_dive_1: null,
    deep_dive_2: null
  };

  // Helper to safely call onTierComplete
  const safeCallback = (tierName, cards) => {
    if (onTierComplete) {
      try {
        onTierComplete(tierName, cards);
      } catch (err) {
        console.error(`[CARDS] Error in onTierComplete callback for ${tierName}:`, err);
      }
    }
  };

  try {
    // Fire all 3 tier requests simultaneously, but handle each completion independently
    const corePromise = generateTier(deckName, {
      tier: 'core',
      tierName: 'Core Essentials',
      cardNumbers: [1, 2, 3, 4, 5],
      focus: 'Big picture overview. Answer: What is this topic? Why does it matter? What are the most interesting/surprising facts? Give them the "aha!" moments.',
      tone: 'Engaging, surprising, accessible - hook them immediately',
      avoidTopics: 'Don\'t go deep into mechanisms (that\'s Deep Dive 1) or obscure edge cases (that\'s Deep Dive 2). Stay high-level and fascinating.'
    }, parentPath).then(cards => {
      console.log(`[CARDS] ✅ Core tier complete (5 cards)`);
      cardsByTier.core = cards;
      safeCallback('core', cards);
      return cards;
    }).catch(err => {
      console.error('[CARDS] Core tier failed:', err);
      cardsByTier.core = [];
      return [];
    });

    const deepDive1Promise = generateTier(deckName, {
      tier: 'deep_dive_1',
      tierName: 'Deep Dive 1',
      cardNumbers: [6, 7, 8, 9, 10],
      focus: 'How it actually works. Cover mechanisms, processes, systems, connections, and deeper explanations. The "behind the scenes" stuff.',
      tone: 'More detailed but still conversational - they\'re engaged now',
      avoidTopics: 'Don\'t repeat basic overview info (that\'s Core Essentials) or dive into obscure trivia (that\'s Deep Dive 2). Focus on explanatory depth.'
    }, parentPath).then(cards => {
      console.log(`[CARDS] ✅ Deep Dive 1 tier complete (5 cards)`);
      cardsByTier.deep_dive_1 = cards;
      safeCallback('deep_dive_1', cards);
      return cards;
    }).catch(err => {
      console.error('[CARDS] Deep Dive 1 tier failed:', err);
      cardsByTier.deep_dive_1 = [];
      return [];
    });

    const deepDive2Promise = generateTier(deckName, {
      tier: 'deep_dive_2',
      tierName: 'Deep Dive 2',
      cardNumbers: [11, 12, 13, 14, 15],
      focus: 'Mind-blowing details and fascinating tangents. Cover: historical discoveries, edge cases, current research, weird exceptions, "tell your friends about this" facts.',
      tone: 'Nerdy, detailed, enthusiastic - reward their curiosity',
      avoidTopics: 'Don\'t repeat overview (Core Essentials) or basic mechanisms (Deep Dive 1). This is the "wow I didn\'t know that!" tier.'
    }, parentPath).then(cards => {
      console.log(`[CARDS] ✅ Deep Dive 2 tier complete (5 cards)`);
      cardsByTier.deep_dive_2 = cards;
      safeCallback('deep_dive_2', cards);
      return cards;
    }).catch(err => {
      console.error('[CARDS] Deep Dive 2 tier failed:', err);
      cardsByTier.deep_dive_2 = [];
      return [];
    });

    // Wait for all to complete
    await Promise.all([corePromise, deepDive1Promise, deepDive2Promise]);

    // Combine all tiers (filter out empty arrays from failed tiers)
    const cards = [...(cardsByTier.core || []), ...(cardsByTier.deep_dive_1 || []), ...(cardsByTier.deep_dive_2 || [])];

    console.log(`[CARDS] ✅ All ${cards.length} cards complete`);

    return { cards, cardsByTier };

  } catch (error) {
    console.error('[CARDS] Error generating cards:', error);
    throw error;
  }
}

// ============================================================================
// NEW: TITLES-FIRST APPROACH (Fast initial load, on-demand content)
// ============================================================================

/**
 * Generate all 15 card titles in ONE API call (~2 seconds)
 * @param {string} deckName - The deck name
 * @param {string} parentPath - Optional parent context path
 * @returns {Promise<Array>} Array of card objects with titles (no content yet)
 */
export async function generateCardTitles(deckName, parentPath = null) {
  console.log(`[TITLES] Generating 15 descriptive titles for: ${deckName}`);

  const parentContext = parentPath
    ? `\nCONTEXT: This is "${deckName}" within "${parentPath}". All titles MUST be relevant to this parent context.\n`
    : '';

  const prompt = `Generate 15 educational flashcard titles about: "${deckName}"
${parentContext}
TITLE FORMAT: "[Specific Concept]: [Clear Description]"
Each title should clearly indicate what the card teaches.

STRUCTURE:
Cards 1-5 (Core Essentials): What is it? Key terms? Fundamental principles?
  - Card 1: Definition/overview of "${deckName}"
  - Card 2-3: Key terminology and basic concepts
  - Card 4-5: Fundamental principles or rules

Cards 6-10 (Deep Dive 1): How does it work? Methods? Processes? Types?
  - Mechanisms and processes
  - Types, variations, or categories
  - Step-by-step explanations
  - Historical context or origins

Cards 11-15 (Deep Dive 2): Applications? Connections? Advanced topics?
  - Real-world applications and examples
  - Connections to other topics
  - Advanced concepts or special cases
  - Historical significance or modern developments

✅ GOOD TITLES (clear, educational):
- "Alveoli Structure: Maximizing Surface Area"
- "The Commutative Property: Order Doesn't Matter"
- "Photosynthesis Basics: Converting Light to Energy"
- "Newton's First Law: Objects Resist Change"

❌ BAD TITLES (vague or clickbait):
- "Cool Facts About Breathing"
- "Why This Topic Is Amazing"
- "The Shocking Truth About..."
- "Everything You Need to Know"

Return ONLY JSON:
{"cards":[{"number":1,"title":"Clear Educational Title"},{"number":2,"title":"Another Specific Title"}]}`;


  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Transform to our card format with tiers
    return result.cards.map(card => {
      const tier = card.number <= 5 ? 'core' : card.number <= 10 ? 'deep_dive_1' : 'deep_dive_2';
      const tierIndex = card.number <= 5 ? card.number - 1 : card.number <= 10 ? card.number - 6 : card.number - 11;

      return {
        id: `${deckName.toLowerCase().replace(/\s+/g, '-')}-${tier}-${tierIndex}-${Date.now()}`,
        number: card.number,
        title: card.title,
        content: null, // Generated on-demand
        tier,
        tierIndex,
        contentLoaded: false
      };
    });

  } catch (error) {
    console.error('[TITLES] Error:', error);
    throw error;
  }
}

/**
 * Generate content for a single card ON-DEMAND (when user flips it)
 * @param {string} deckName - The deck name
 * @param {number} cardNumber - Card number (1-15)
 * @param {string} cardTitle - The card's title
 * @param {Array} allTitles - All card titles (to avoid repetition)
 * @returns {Promise<string>} The card content
 */
export async function generateSingleCardContent(deckName, cardNumber, cardTitle, allTitles, onStreamUpdate = null) {
  console.log(`[CONTENT] ${onStreamUpdate ? 'Streaming' : 'Generating'} for card ${cardNumber}: ${cardTitle}`);

  // Determine tier context
  let tierContext = '';
  if (cardNumber <= 5) {
    tierContext = 'CORE ESSENTIALS - Foundational concepts. Reader is new to this topic.';
  } else if (cardNumber <= 10) {
    tierContext = 'DEEP DIVE 1 - How it works. Mechanisms, processes, types. Reader knows basics.';
  } else {
    tierContext = 'DEEP DIVE 2 - Applications and connections. Advanced topics. Reader is engaged.';
  }

  // Include other titles to avoid repetition
  const otherTitles = allTitles
    .filter(t => t.number !== cardNumber)
    .map(t => `Card ${t.number}: ${t.title}`)
    .join('\n');

  const prompt = `Create educational flashcard content for a learning app.

TOPIC: "${deckName}"
CARD TITLE: "${cardTitle}"
CARD NUMBER: ${cardNumber} of 15
TIER: ${tierContext}

OTHER CARDS (do not overlap):
${otherTitles}

Generate original educational content (65-70 words) that teaches this concept clearly.

CONTENT REQUIREMENTS:
- Length: EXACTLY 65-70 words (count carefully!)
- Structure:
  * First 1-2 sentences: State what this card teaches
  * Middle sentences: Explain with specific examples, numbers, facts
  * Final 1-2 sentences: Why it matters or how it connects

WRITING STYLE:
- Educational and clear, like a great teacher explaining it
- Use concrete examples and specific numbers/facts
- Explain WHY things work, not just WHAT they are
- Conversational but informative
- Every sentence should teach something

❌ AVOID:
- Dramatic hooks or clickbait openers
- Vague statements ("many scientists believe...")
- Filler words or throat-clearing
- Entertainment over education

Return ONLY the text content (65-70 words):`;

  try {
    // Use streaming if callback provided
    if (onStreamUpdate) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 250,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                fullContent += text;
                onStreamUpdate(fullContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullContent.trim();
    }

    // Non-streaming fallback (for background generation)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].text.trim();

  } catch (error) {
    console.error('[CONTENT] Error:', error);
    throw error;
  }
}

// ============================================================================
// NEW: Tier-by-tier card generation with streaming (progressive display)
// ============================================================================

const TIER_CONFIG = {
  core: {
    name: 'Core Essentials',
    startNumber: 1,
    guidance: `Card 1: What is this topic? (definition + why it matters)
Cards 2-3: Key terminology and basic concepts
Cards 4-5: Fundamental principles or rules`,
  },
  deep_dive_1: {
    name: 'Deep Dive 1',
    startNumber: 6,
    guidance: `How it works - mechanisms and processes
Types, variations, or categories
Historical context or key figures`,
  },
  deep_dive_2: {
    name: 'Deep Dive 2',
    startNumber: 11,
    guidance: `Real-world applications and examples
Connections to other topics
Advanced concepts or fascinating facts`,
  }
};

/**
 * Generate 5 cards for a specific tier with streaming support
 * @param {string} topicName - The topic
 * @param {string} tier - 'core' | 'deep_dive_1' | 'deep_dive_2'
 * @param {Array} previousCards - Cards from previous tiers (to avoid repetition)
 * @param {string} parentContext - Optional parent context
 * @param {Function} onCard - Callback fired when each card is ready (for progressive display)
 * @returns {Promise<Array>} Array of 5 card objects
 */
export async function generateTierCards(topicName, tier, previousCards = [], parentContext = null, onCard = null) {
  const config = TIER_CONFIG[tier];
  if (!config) throw new Error(`Unknown tier: ${tier}`);

  console.log(`[TIER] Generating ${config.name} (5 cards) for: ${topicName}${onCard ? ' [STREAMING]' : ''}`);

  // Build context from previous cards
  let previousContext = '';
  if (previousCards.length > 0) {
    previousContext = `\nALREADY COVERED (do NOT repeat):
${previousCards.map(c => `- "${c.title}": ${c.content?.substring(0, 80)}...`).join('\n')}

Build on this foundation - go deeper, not sideways.\n`;
  }

  const contextHint = parentContext
    ? `Context: "${topicName}" within "${parentContext}".\n`
    : '';

  // Use delimiters for streaming so we can parse cards as they arrive
  //
  // OLD PROMPT (wall of text format) - kept for easy revert:
  // Each card needs:
  // - "title": Clear topic (4-8 words), format "[Concept]: [Description]"
  // - "content": 50-60 words teaching ONE specific thing
  //
  const prompt = `Generate 5 educational flashcards about "${topicName}" for ${config.name}.
${contextHint}${previousContext}
FOCUS FOR THIS TIER:
${config.guidance}

Each card needs:
- "title": Clear topic (4-8 words), format "[Concept]: [Description]"
- "content": 50-60 words teaching ONE specific thing

Rules:
- Use specific facts, numbers, names (not vague statements)
- Each card = one concept, not a summary
- No overlap with previous cards

IMPORTANT: Output each card with delimiters so it can be displayed immediately:
###CARD###
{"number": ${config.startNumber}, "title": "...", "content": "..."}
###END###
###CARD###
{"number": ${config.startNumber + 1}, "title": "...", "content": "..."}
###END###
(continue for all 5 cards)`;

  const timestamp = Date.now();
  const allCards = [];

  try {
    // Use streaming if callback provided
    if (onCard) {
      let buffer = '';
      let cardsFound = 0;

      const stream = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          buffer += event.delta.text;

          // Look for complete cards in the buffer
          while (buffer.includes('###CARD###') && buffer.includes('###END###')) {
            const startIdx = buffer.indexOf('###CARD###');
            const endIdx = buffer.indexOf('###END###');

            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              const cardJson = buffer.substring(startIdx + 10, endIdx).trim();

              try {
                const card = JSON.parse(cardJson);
                const formattedCard = {
                  id: `${topicName.toLowerCase().replace(/\s+/g, '-')}-${tier}-${cardsFound}-${timestamp}`,
                  number: card.number || config.startNumber + cardsFound,
                  title: card.title,
                  content: card.content,
                  tier,
                  tierIndex: cardsFound,
                  contentLoaded: true
                };

                allCards.push(formattedCard);
                cardsFound++;
                console.log(`[TIER] 📦 Card ${cardsFound}/5 ready: ${card.title}`);

                // Fire callback immediately so UI can update
                onCard(formattedCard, cardsFound);

              } catch (parseErr) {
                console.warn('[TIER] Failed to parse card JSON:', cardJson.substring(0, 100));
              }

              // Remove processed card from buffer
              buffer = buffer.substring(endIdx + 9);
            } else {
              break;
            }
          }
        }
      }

      console.log(`[TIER] ✅ Streamed ${allCards.length} cards for: ${topicName}`);
      return allCards;

    } else {
      // Non-streaming fallback (for background generation)
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = message.content[0].text.trim();

      // Parse all cards from delimited format
      const cardMatches = responseText.matchAll(/###CARD###\s*([\s\S]*?)\s*###END###/g);

      for (const match of cardMatches) {
        try {
          const card = JSON.parse(match[1].trim());
          const formattedCard = {
            id: `${topicName.toLowerCase().replace(/\s+/g, '-')}-${tier}-${allCards.length}-${timestamp}`,
            number: card.number || config.startNumber + allCards.length,
            title: card.title,
            content: card.content,
            tier,
            tierIndex: allCards.length,
            contentLoaded: true
          };
          allCards.push(formattedCard);
        } catch (parseErr) {
          console.warn('[TIER] Failed to parse card:', match[1].substring(0, 50));
        }
      }

      // Fallback: try JSON array format if delimiter parsing failed
      if (allCards.length === 0) {
        let jsonText = responseText;
        if (responseText.includes('```')) {
          jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        const cards = JSON.parse(jsonText);
        if (Array.isArray(cards)) {
          cards.forEach((card, index) => {
            allCards.push({
              id: `${topicName.toLowerCase().replace(/\s+/g, '-')}-${tier}-${index}-${timestamp}`,
              number: card.number || config.startNumber + index,
              title: card.title,
              content: card.content,
              tier,
              tierIndex: index,
              contentLoaded: true
            });
          });
        }
      }

      if (allCards.length !== 5) {
        console.warn(`[TIER] Expected 5 cards, got ${allCards.length}`);
      }

      console.log(`[TIER] ✅ Generated ${allCards.length} cards for: ${topicName}`);
      return allCards;
    }

  } catch (error) {
    console.error(`[TIER] Error generating ${config.name}:`, error);
    throw error;
  }
}

// ============================================================================
// LEGACY: Original card content generation (kept for backward compatibility)
// ============================================================================

/**
 * Generate content for a deck's overview card (for the Canvas card system)
 * @param {string} deckName - The name of the deck (e.g., "History", "Ancient Egypt")
 * @param {string} cardTitle - The title of the card (e.g., "What is History?")
 * @param {string} parentContext - Optional parent deck name for context
 * @param {string} tier - Card tier: 'core' | 'deep_dive_1' | 'deep_dive_2'
 * @returns {Promise<string>} The card content
 */
export async function generateCardContent(deckName, cardTitle, parentContext = null, tier = 'core') {
  try {
    const contextHint = parentContext
      ? `This card is in the "${deckName}" deck, which is inside "${parentContext}".`
      : `This card is in the "${deckName}" deck.`;

    // Check if this is the grounding card (Card 1 where title starts with deck name)
    const isGroundingCard = cardTitle.toLowerCase().trim().startsWith(deckName.toLowerCase().trim());

    // Tier-specific content guidelines - tone varies by tier
    const tierGuidelines = {
      core: {
        tone: 'Clear + engaging. Prioritize understanding.',
        focus: 'Answer the obvious questions. Big picture, basic facts, why it matters.',
        depth: 'Assume reader knows NOTHING. Explain any jargon.'
      },
      deep_dive_1: {
        tone: 'Surprising + connective. The "aha" moments.',
        focus: 'Answer the "how/why" follow-ups. Mechanisms, causes, connections.',
        depth: 'Reader knows basics. Can use some technical terms with brief context.'
      },
      deep_dive_2: {
        tone: 'Obscure + expert. The flex-worthy trivia.',
        focus: 'The stuff only a REALLY curious person would ask about. Debates, edge cases, surprises.',
        depth: 'Reader is engaged. Technical depth OK. Impress them.'
      }
    };

    const guidelines = tierGuidelines[tier] || tierGuidelines.core;

    // Special instructions for the grounding card
    const groundingCardInstructions = isGroundingCard ? `
🚨 THIS IS THE GROUNDING CARD - the reader's FIRST encounter with "${deckName}".
Orient them AND hook them in 40-60 words total.

Structure:
1. What is it? (1 punchy sentence)
2. Why should they care? (1-2 sentences with a specific hook)

Example for "Legendary Creatures" (52 words):
"Every culture invented monsters - dragons in China, griffins in Persia, wendigos among the Algonquin. These weren't bedtime stories. They explained real fears: floods, disappearances, the sounds in the forest at night. Some creatures appear in cultures that never contacted each other."

Example for "Solidarity" (48 words):
"In 1980, Polish shipyard workers did the impossible. They challenged Soviet communism and won. Their union grew to 10 million members in two weeks - a quarter of Poland's workforce. Within a decade, the Soviet bloc collapsed."

` : '';

    const prompt = `Write content for a learning card.

${contextHint}

Card title: "${cardTitle}"
${groundingCardInstructions}
⚠️ LENGTH: 50-70 words STRICTLY. Count them. This is non-negotiable.

TIER: ${tier.toUpperCase().replace('_', ' ')}
- Tone: ${guidelines.tone}
- Focus: ${guidelines.focus}
- Depth: ${guidelines.depth}

STRUCTURE (all within 40-60 words):
1. HOOK (first sentence): Grab attention with a surprising fact or question
2. CONTEXT: Brief background that sets up the payoff
3. MECHANISM/DETAIL: The "how" or "what" - the meat of the card
4. LANDING: End with the surprising implication or "so what"

WRITING RULES:
- Use SPECIFIC numbers, names, dates (not "many" or "often")
- Write conversationally - like telling a friend something cool
- Start sentences with action words, not "The" or "It"
- Each card = ONE nugget of wisdom, not a summary

❌ BANNED PHRASES:
- "Interestingly..." / "It's worth noting..."
- "throughout history" → Name the specific era
- "changed everything" → Say HOW specifically
- "one of the most important" → Give actual numbers
- Any academic throat-clearing

✅ GOOD EXAMPLES (notice: ~50 words, punchy, specific):

"Roman concrete outlasted modern concrete by 2,000 years. The secret? Volcanic ash mixed with seawater created a chemical reaction that actually strengthened over time. When waves hit Roman harbors, the structures got stronger. Modern engineers are now reverse-engineering the recipe."

"Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs - still edible. The combination of low moisture, high acidity, and natural hydrogen peroxide creates an environment where bacteria simply can't survive."

Write the content for "${cardTitle}" - just the content, no title or labels:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150, // 60-80 words = ~100-120 tokens, 150 gives buffer
      messages: [{ role: 'user', content: prompt }]
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating card content:', error);
    throw new Error('Failed to generate card content');
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
