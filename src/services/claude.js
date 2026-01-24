import Anthropic from '@anthropic-ai/sdk';
import { getWikipediaSubtopics, hasWikipediaMapping } from './wikipedia';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

// =============================================================================
// MODEL CONFIGURATION - Flip this to switch back to Sonnet if Opus is too slow
// =============================================================================
const USE_OPUS = false;  // Set to false to revert to Sonnet

const MODELS = {
  // For main content generation (outlines, cards, previews)
  CONTENT: USE_OPUS ? 'claude-opus-4-20250514' : 'claude-sonnet-4-20250514',
  // For quick tasks (classification, definitions) - always fast
  FAST: 'claude-3-5-haiku-20241022',
};
// =============================================================================

/**
 * Topic types for content generation
 * Each type gets different outline templates and card generation strategies
 */
export const TOPIC_TYPES = {
  MEDICAL: 'MEDICAL',       // condition, disease, procedure, anatomy
  PLACE: 'PLACE',           // landmark, city, building, geographic feature
  EVENT: 'EVENT',           // historical event, war, revolution, discovery
  PERSON: 'PERSON',         // historical figure, scientist, artist, leader
  CONCEPT: 'CONCEPT',       // idea, theory, philosophy, system
  SCIENCE: 'SCIENCE',       // scientific principle, phenomenon, field
  OBJECT: 'OBJECT',         // invention, artifact, technology
  ART: 'ART',               // artwork, music, literature, film
  ORGANISM: 'ORGANISM',     // animal, plant, species
  ORGANIZATION: 'ORGANIZATION' // company, institution, group
};

/**
 * Classify a topic into one of the predefined types
 * Used to determine which outline template and generation strategy to use
 * @param {string} topic - The topic name to classify
 * @param {string} parentPath - Optional parent context for disambiguation
 * @returns {Promise<string>} One of the TOPIC_TYPES values
 */
export async function classifyTopic(topic, parentPath = null) {
  try {
    const contextHint = parentPath ? `\nContext: This topic is under "${parentPath}"` : '';

    const prompt = `Classify this topic for a learning app.

Topic: "${topic}"${contextHint}

Classify into exactly ONE of these types:
- MEDICAL — condition, disease, procedure, anatomy, symptoms, treatments
- PLACE — landmark, city, building, museum, geographic feature, country
- EVENT — historical event, war, battle, revolution, discovery, disaster
- PERSON — historical figure, scientist, artist, leader, inventor, celebrity
- CONCEPT — idea, theory, philosophy, system, methodology, framework
- SCIENCE — scientific principle, phenomenon, field of study, natural law
- OBJECT — invention, artifact, technology, tool, vehicle, weapon
- ART — artwork, music piece, literature, film, album, artistic movement
- ORGANISM — animal, plant, species, biological group
- ORGANIZATION — company, institution, government body, group, team

Output ONLY the type in caps, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap for classification
      max_tokens: 20,
      messages: [{ role: 'user', content: prompt }]
    });

    const result = message.content[0].text.trim().toUpperCase();

    // Validate it's a known type
    if (TOPIC_TYPES[result]) {
      console.log(`[classifyTopic] "${topic}" → ${result}`);
      return result;
    }

    // Default to CONCEPT if we get an unexpected response
    console.warn(`[classifyTopic] Unexpected result "${result}" for "${topic}", defaulting to CONCEPT`);
    return TOPIC_TYPES.CONCEPT;
  } catch (error) {
    console.error('[classifyTopic] Error:', error);
    return TOPIC_TYPES.CONCEPT; // Safe default
  }
}

/**
 * Get topic-type specific guidance for preview generation
 * @param {string} topicType - The classified topic type
 * @returns {string} Additional guidance for the prompt
 */
function getPreviewGuidance(topicType) {
  const guidance = {
    PERSON: `
FOR A PERSON: First sentence says who they were and what they did. Second says why they matter. Third adds a specific detail about their life or work.`,
    PLACE: `
FOR A PLACE: First sentence says what/where it is. Second says what makes it significant. Third adds a specific detail — size, history, or notable feature.`,
    EVENT: `
FOR AN EVENT: First sentence says what happened and when. Second says why it mattered. Third adds a key detail — a cause, consequence, or turning point.`,
    MEDICAL: `
FOR A MEDICAL TOPIC: First sentence says what the condition/procedure is. Second says who it affects or why it matters. Third adds a key detail about symptoms, treatment, or mechanism.`,
    CONCEPT: `
FOR A CONCEPT: First sentence defines it simply. Second explains where you encounter it or why it matters. Third adds a key detail about how it works or what it includes.`,
    SCIENCE: `
FOR A SCIENCE TOPIC: First sentence says what it is. Second says why it matters or what it explains. Third adds a key detail about how it works or where it applies.`,
    OBJECT: `
FOR AN OBJECT: First sentence says what it is. Second says what it enabled or why it matters. Third adds a detail about its history or how it works.`,
    ART: `
FOR AN ART WORK: First sentence says what it is and who made it. Second says why it's significant. Third adds a detail about its content, style, or impact.`,
    ORGANISM: `
FOR AN ORGANISM: First sentence says what it is. Second says what makes it notable. Third adds a specific detail — habitat, behavior, or distinguishing feature.`,
    ORGANIZATION: `
FOR AN ORGANIZATION: First sentence says what it is and does. Second says why it matters. Third adds a specific detail about its history, size, or impact.`
  };

  return guidance[topicType] || '';
}

/**
 * Generate a preview/pitch for a topic (what it is + one "wait, what?" detail)
 * Used for the "cover card" that appears before committing to learn a topic
 * @param {string} topic - The topic to preview
 * @param {string} parentPath - The path context (e.g., "History > Ancient World")
 * @param {string} topicType - The classified topic type (PERSON, PLACE, EVENT, etc.)
 * @returns {Promise<{preview: string}>}
 */
export async function generateTopicPreview(topic, parentPath = null, topicType = null) {
  try {
    const contextNote = parentPath ? `\nContext: This is under "${parentPath}"` : '';
    const typeNote = topicType ? `\nTopic type: ${topicType}` : '';

    // Topic-type specific guidance
    const typeGuidance = getPreviewGuidance(topicType);

    const prompt = `Write a preview for "${topic}" — a clear intro that tells someone what this topic is and why it matters.${contextNote}${typeNote}

FORMAT:
- 3 SHORT sentences, each on its own line (separated by blank lines)
- One idea per sentence. No compound sentences.
- Bold **one or two key terms** total, not more
- Aim for 40-60 words total

TONE: Clear and direct. Like a friend explaining what something is, not selling you on it.

READING LEVEL:
- Write for a general audience (no specialized knowledge assumed)
- Avoid jargon and technical terms unless they're the key terms you're bolding
- If a word feels "medical" or "academic," use a simpler alternative
- Examples: "acute" → "sudden" or "serious", "utilize" → "use", "approximately" → "about"

RULES:
- First sentence: What is it? (simple, clear definition or description)
- Second sentence: Why does it matter? (context, significance, or what it connects to)
- Third sentence: One more key fact — a detail, component, or connection that adds to the picture
- Be specific (dates, numbers, names) but don't cram
- No rhetorical questions
- No "You'll learn..." or "We'll explore..." — don't narrate the learning, just teach
- No "dramatically" / "fundamentally" / "particularly fascinating"
- No hooks or cliffhangers — just clarity

${typeGuidance}

EXAMPLE (Cytoskeleton):
The **cytoskeleton** is a network of protein fibers that gives cells their shape and helps them move.

It acts like scaffolding inside the cell, organizing organelles and enabling cell division and transport.

It has three main components — microtubules, actin filaments, and intermediate filaments — each with different jobs.

EXAMPLE (French Revolution):
The **French Revolution** was the overthrow of France's monarchy between 1789 and 1799.

It transformed France from a kingdom into a republic and spread ideas about rights and democracy across Europe.

It began with financial crisis and ended with Napoleon's rise to power.

Write ONLY the preview text - no intro, no labels.`;

    const message = await anthropic.messages.create({
      model: MODELS.CONTENT,
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }]
    });

    return { preview: message.content[0].text.trim() };
  } catch (error) {
    console.error('Error generating topic preview:', error);
    throw new Error('Failed to generate preview');
  }
}

/**
 * Generate an outline for a topic with core and deep_dive sections
 * Used for background pre-generation while user reads preview card
 * @param {string} topic - The topic name
 * @param {string} parentContext - Optional parent path context
 * @param {string} previewText - Optional preview card text to avoid repeating
 * @param {string} topicType - Optional classified topic type for structure guidance
 * @returns {Promise<{outline: Object}>} outline with core and deep_dive arrays
 */
export async function generateTopicOutline(topic, parentContext = null, previewText = null, topicType = null, onSection = null, onCounts = null) {
  console.log(`[OUTLINE] Generating outline for: ${topic}${previewText ? ' (with preview context)' : ''}${topicType ? ` [${topicType}]` : ''}${onSection ? ' [STREAMING]' : ''}`);

  const contextNote = parentContext ? `\nContext: "${topic}" is under "${parentContext}"` : '';
  const typeNote = topicType ? `\nTopic type: ${topicType}` : '';

  const previewNote = previewText ? `

IMPORTANT - THE USER ALREADY SAW THIS PREVIEW:
"""
${previewText}
"""
Do NOT repeat any facts, numbers, or details from the preview. The outline should teach NEW information that builds on (but doesn't duplicate) what the preview already covered.` : '';

  const prompt = `Create a complete teaching outline for "${topic}".${contextNote}${typeNote}${previewNote}

You're a teacher planning a lesson. Write out EVERYTHING someone needs to understand this topic - organized logically, with full explanations.

This is not a list of facts. This is the actual lesson, written out in outline form.

IMPORTANT - START WITH COUNTS:
Before writing the outline, output exactly these two lines first:
[CORE_COUNT: X]
[DEEP_COUNT: X]
where X is the number of sections you plan to write for each. Then write the outline as normal.

FORMAT:
- Roman numerals (I, II, III) for main sections
- Letters (A, B, C) for subsections within each section
- Full sentences that explain, not fragments that list
- Mark each main section as [CORE] or [DEEP DIVE]

SECTION COUNT:
Let the topic dictate the count. Don't target a number.

CORE sections: As many as needed to cover the fundamentals completely.
- Simple topic (Pencil, Spoon): might only need 3
- Medium topic (Photosynthesis, Napoleon): might need 5-6
- Complex topic (World War II, Human Immune System): might need 7-8
- Ask: "After these sections, could someone explain this topic to a friend with no gaps?" If not, add more.

DEEP DIVE sections: As many as the topic warrants.
- Some topics have rich history, controversies, edge cases worth 4-5 sections
- Others have little worth exploring beyond the core - maybe just 1-2
- Don't pad. Don't skip interesting stuff either.

Total usually lands between 8-15 cards, but that's an outcome, not a target.

Within each section:
- 2-3 subsections
- 2-3 bullet points per subsection

WRITING STYLE:
- Write in complete sentences, not bullet fragments
- Explain WHY things matter, not just WHAT happened
- Connect the dots - show how one thing leads to another
- Include specific facts, numbers, names - but embed them in explanations
- Each bullet point should teach something, not just state something

READING LEVEL:
- Write for a general audience (no specialized knowledge assumed)
- Avoid jargon unless absolutely necessary - if you use a technical term, explain it immediately in plain language
- Prefer simple words: "clotting" not "coagulation", "swelling" not "edema", "fatty layer" not "subcutaneous tissue"
- If a term is important to know (like "hemoglobin"), bold it and explain it in the same sentence, then add it to popup terms
- No academic or medical-speak - write like you're explaining to a curious friend

CONCISENESS:
- Say it once, say it clearly, move on
- Cut filler phrases: "It's important to note that..." → just state it
- If a sentence doesn't teach something new, cut it
- Aim for clarity in fewer words, not thoroughness in more words
- Each bullet should be 1-2 sentences, not a paragraph

BAD (too wordy):
   - Pure mathematics seeks truth through logical proof rather than experimental evidence. When a mathematician proves something, it becomes eternally true in a way that scientific theories can never be.

GOOD (concise):
   - Pure mathematics proves things through logic, not experiments. Once proven, a theorem stays true forever.

BAD (fragment list):
   - Born in Budapest, 1930
   - Jewish family
   - Survived Nazi occupation with false identities

GOOD (explanatory sentences):
   - George Soros was born György Schwartz in Budapest, Hungary in 1930 to a Jewish family.
   - When the Nazis occupied Hungary in 1944, his family survived by using false identities. This shaped his lifelong belief that open societies must be defended.

BAD (jargon-heavy):
   - The inflammatory response triggers macrophage activity in the subcutaneous tissue.

GOOD (plain language):
   - Within minutes of injury, your body sends white blood cells to clean up the leaked blood and damaged tissue.

[CORE] sections:
- Essential knowledge to understand this topic
- After Core, someone could explain this topic to a friend
- Be thorough but focused - don't pad, but don't skip important stuff
- Build logically - later sections assume earlier knowledge

[DEEP DIVE] sections:
- Optional bonus content for the curious
- History, origin stories, edge cases, famous examples, lesser-known facts
- Someone can skip these entirely and still understand the topic

STRUCTURE GUIDE BY TOPIC TYPE:

For CONCEPTS (Watt, GDP, Inflation):
- What is it? → How does it work? → Real-life applications
- Deep Dive: history, edge cases, misconceptions

For PROCESSES (Photosynthesis, Digestion):
- What is it? → What's needed? → How does it work? → What's the result?
- Deep Dive: variations, exceptions, discovery history

For PEOPLE (Marie Curie, Napoleon):
- Why are they famous? (lead with this) → Key achievement → How they got there → Impact/legacy
- Deep Dive: personal life, controversies, lesser-known facts

For EVENTS (French Revolution, Moon Landing):
- What happened? → What caused it? → How did it unfold? → Consequences
- Deep Dive: specific moments, key figures, myths vs reality

For WORKS/ARTIFACTS (Shakespeare's Sonnets, Guernica):
- What is it? → Structure/form → What's it about? → Why it matters
- Deep Dive: creation story, famous parts, controversies

IF YOUR TOPIC DOESN'T FIT THESE CATEGORIES:
- Structure it around: What is it? → How does it work? → Why does it matter?
- Deep Dive: history, edge cases, interesting details
- Ask yourself: What questions MUST be answered for someone to understand this? Those are your Core sections.

IMPORTANT FOR PEOPLE:
- Lead with why they're famous, not chronological biography
- Ask: "If someone remembers one thing about this person, what should it be?" Put that first.

EXAMPLE - "Watt" (concept):
Note: This example shows 4 CORE + 2 DEEP DIVE. Your topic may need more or fewer.

I. What is a watt? [CORE]
   A. Definition
      - A watt measures power - the rate at which energy gets used. Not how much energy, but how fast you're using it.
      - One watt equals one joule of energy per second.
   B. Everyday examples
      - Phone charger: about 20 watts (slow). Microwave: about 1000 watts (fast).
      - Both use electricity, but at very different rates. That's what wattage tells you.

II. Energy vs power [CORE]
   A. The key distinction
      - Energy is the total amount. Power is the speed you use it.
      - Like driving: energy is miles traveled, power is your speed.
   B. How they connect
      - Power sustained over time equals energy. A 100-watt bulb uses 100 joules every second.
      - Leave it on for an hour: 360,000 joules total. Wattage stayed constant, energy accumulated.

III. The formula: Watts = Volts × Amps [CORE]
   A. Voltage and current
      - Voltage is electrical pressure. Amps measure how much electricity flows.
      - Think of water: voltage is pressure, amps is gallons per minute.
   B. How they combine
      - Pressure × flow = power. A 120-volt outlet with 10 amps flowing = 1,200 watts.

[Continue pattern for remaining sections...]

IV. Kilowatts and your electric bill [CORE]
V. Why it's called a watt [DEEP DIVE]
VI. The horsepower connection [DEEP DIVE]

POPUP TERMS:
- Joule: A unit of energy. About what it takes to lift an apple one meter.
- Voltage/Volts: Electrical pressure. US outlets are 120V; dryers use 240V.
- Amps/Current: How much electricity flows. Like gallons per minute through a pipe.
- Kilowatt-hour: Power × time. What your electric bill charges for.

END OF EXAMPLE

RULES:
- Write explanations, not fragment lists
- Be concise - every sentence should teach something new
- Be specific - use real facts, numbers, names
- Connect ideas - show how one thing leads to another
- For people: lead with fame/achievement, not chronological biography
- Core must be complete - no gaps in understanding
- Flag 4-8 popup terms (terms a beginner might not know)

OUTPUT:
Return the full outline as structured text with [CORE] and [DEEP DIVE] labels. End with POPUP TERMS section.`;

  try {
    // If streaming callback provided, stream and parse sections as they complete
    if (onSection) {
      let buffer = '';
      let totalSectionCount = 0;
      const tierSectionCount = { core: 0, deep_dive: 0 };
      const streamedCards = { core: [], deep_dive: [] };
      let countsParsed = false;

      // Regex to detect section headers
      const sectionHeaderRegex = /^(?:#{1,3}\s*)?([IVXLC]+)\.\s+(.+?)(?:\s+\[(CORE|DEEP DIVE)\])?\s*$/im;

      // Regex to detect count lines
      const coreCountRegex = /\[CORE_COUNT:\s*(\d+)\]/i;
      const deepCountRegex = /\[DEEP_COUNT:\s*(\d+)\]/i;

      const stream = await anthropic.messages.create({
        model: MODELS.CONTENT,
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          buffer += event.delta.text;

          // Try to parse counts early (before sections start)
          if (!countsParsed && onCounts) {
            const coreMatch = buffer.match(coreCountRegex);
            const deepMatch = buffer.match(deepCountRegex);
            if (coreMatch && deepMatch) {
              const coreCount = parseInt(coreMatch[1], 10);
              const deepCount = parseInt(deepMatch[1], 10);
              console.log(`[OUTLINE STREAM] Counts detected: core=${coreCount}, deep_dive=${deepCount}`);
              onCounts(coreCount, deepCount);
              countsParsed = true;
            }
          }

          // Check if we have a complete section (next section header found)
          // Split buffer to find section boundaries
          const lines = buffer.split('\n');
          let sectionStartIdx = -1;
          let nextSectionIdx = -1;

          // Find first section header
          for (let i = 0; i < lines.length; i++) {
            if (sectionHeaderRegex.test(lines[i].trim())) {
              if (sectionStartIdx === -1) {
                sectionStartIdx = i;
              } else {
                nextSectionIdx = i;
                break;
              }
            }
          }

          // If we found a complete section (has start AND next section), parse and emit it
          if (sectionStartIdx !== -1 && nextSectionIdx !== -1) {
            const sectionLines = lines.slice(sectionStartIdx, nextSectionIdx);
            const sectionText = sectionLines.join('\n');

            // Parse this single section
            const parsed = parseSingleSection(sectionText);
            if (parsed) {
              const tier = parsed.tier === 'deep_dive' ? 'deep_dive' : 'core';
              tierSectionCount[tier]++;
              totalSectionCount++;
              streamedCards[tier].push(parsed.card);

              console.log(`[OUTLINE STREAM] Section ${totalSectionCount} ready: "${parsed.card.title}" [${tier}] (${tier} #${tierSectionCount[tier]})`);

              // Fire callback with the card - pass tier-specific section number for placeholder indexing
              onSection(parsed.card, tier, tierSectionCount[tier]);
            }

            // Keep only from the next section onwards in buffer
            buffer = lines.slice(nextSectionIdx).join('\n');
          }
        }
      }

      // Parse any remaining section at end of stream
      if (buffer.trim()) {
        // Check for POPUP TERMS first
        const popupIdx = buffer.indexOf('POPUP TERMS');
        let remainingSection = popupIdx !== -1 ? buffer.substring(0, popupIdx) : buffer;

        if (remainingSection.trim()) {
          const parsed = parseSingleSection(remainingSection);
          if (parsed) {
            const tier = parsed.tier === 'deep_dive' ? 'deep_dive' : 'core';
            tierSectionCount[tier]++;
            totalSectionCount++;
            streamedCards[tier].push(parsed.card);
            console.log(`[OUTLINE STREAM] Final section ${totalSectionCount} ready: "${parsed.card.title}" [${tier}] (${tier} #${tierSectionCount[tier]})`);
            onSection(parsed.card, tier, tierSectionCount[tier]);
          }
        }
      }

      // Parse popup terms from buffer
      const popupTerms = parsePopupTerms(buffer);

      const outline = {
        core: streamedCards.core,
        deep_dive: streamedCards.deep_dive,
        popup_terms: popupTerms
      };

      console.log(`[OUTLINE] ✅ Streamed outline for: ${topic} (${totalSectionCount} sections: Core=${outline.core.length}, DeepDive=${outline.deep_dive.length})`);
      return { outline, rawOutline: buffer };
    }

    // Non-streaming fallback (for background generation)
    const message = await anthropic.messages.create({
      model: MODELS.CONTENT,
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text.trim();

    // Parse the structured text outline into our card format
    const outline = parseOutlineText(responseText);

    const coreCount = outline.core.length;
    const ddCount = outline.deep_dive.length;
    const totalCount = coreCount + ddCount;

    // Debug: log first card to verify content exists
    if (outline.core.length > 0) {
      console.log(`[OUTLINE] First core card:`, JSON.stringify(outline.core[0], null, 2));
      console.log(`[OUTLINE] Has content: ${!!outline.core[0].content}`);
    }

    console.log(`[OUTLINE] ✅ Generated outline for: ${topic} (${totalCount} sections: Core=${coreCount}, DeepDive=${ddCount}, PopupTerms=${outline.popup_terms?.length || 0})`);
    return { outline, rawOutline: responseText };
  } catch (error) {
    console.error('[OUTLINE] Error generating outline:', error);
    throw new Error('Failed to generate outline');
  }
}

/**
 * Parse a single section from streaming text
 */
function parseSingleSection(text) {
  const lines = text.split('\n');
  const sectionMatch = lines[0].trim().match(/^(?:#{1,3}\s*)?([IVXLC]+)\.\s+(.+?)(?:\s+\[(CORE|DEEP DIVE)\])?\s*$/i);

  if (!sectionMatch) return null;

  const title = sectionMatch[2].trim();
  const tier = sectionMatch[3]?.toLowerCase().replace(' ', '_') || 'core';
  const subsections = [];

  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Subsection header (A. B. C. etc)
    const subsectionMatch = trimmed.match(/^(?:#{1,4}\s*)?([A-Z])\.\s+(.+)$/);
    if (subsectionMatch) {
      subsections.push({
        label: subsectionMatch[1],
        title: subsectionMatch[2],
        bullets: []
      });
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('- ') && subsections.length > 0) {
      subsections[subsections.length - 1].bullets.push(trimmed.substring(2));
    }
  }

  if (subsections.length === 0) return null;

  return {
    tier: tier === 'deep_dive' ? 'deep_dive' : 'core',
    card: {
      title,
      concept: formatSubsectionsAsConcept(subsections),
      content: formatSubsectionsAsContent(subsections)
    }
  };
}

/**
 * Parse popup terms from text
 */
function parsePopupTerms(text) {
  const terms = [];
  const lines = text.split('\n');
  let inPopupSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('POPUP TERMS')) {
      inPopupSection = true;
      continue;
    }
    if (inPopupSection && trimmed.startsWith('- ') && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const term = trimmed.substring(2, colonIdx).trim();
      const definition = trimmed.substring(colonIdx + 1).trim();
      terms.push({ term, definition });
    }
  }
  return terms;
}

/**
 * Parse structured text outline into card format
 * Converts Roman numeral sections into cards with content from bullet points
 */
function parseOutlineText(text) {
  const core = [];
  const deep_dive = [];
  const popup_terms = [];

  console.log(`[PARSER] Starting to parse outline, ${text.length} chars`);

  // Split into lines for processing
  const lines = text.split('\n');

  let currentSection = null;
  let currentTier = null;
  let currentSubsections = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for POPUP TERMS section
    if (trimmed.startsWith('POPUP TERMS:') || trimmed === 'POPUP TERMS') {
      // Parse remaining lines as popup terms
      for (let j = i + 1; j < lines.length; j++) {
        const termLine = lines[j].trim();
        if (termLine.startsWith('- ') && termLine.includes(':')) {
          const colonIdx = termLine.indexOf(':');
          const term = termLine.substring(2, colonIdx).trim();
          const definition = termLine.substring(colonIdx + 1).trim();
          popup_terms.push({ term, definition });
        }
      }
      break;
    }

    // Check for Roman numeral section header (I. II. III. etc)
    // Handles formats: "I. Section [CORE]" or "## I. Section [CORE]" (with markdown heading)
    // Must have [CORE] or [DEEP DIVE] tag, OR be a non-ambiguous Roman numeral (not single C, D, L, M which are subsection letters)
    const sectionMatch = trimmed.match(/^(?:#{1,3}\s*)?([IVXLC]+)\.\s+(.+?)(?:\s+\[(CORE|DEEP DIVE)\])?\s*$/i);
    const romanNumeral = sectionMatch?.[1]?.toUpperCase();
    const hasTierTag = !!sectionMatch?.[3];
    // Single letters C, D, L, M are ambiguous (could be subsections) - only treat as section if has tier tag
    const isAmbiguousSingleLetter = romanNumeral && romanNumeral.length === 1 && ['C', 'D', 'L', 'M'].includes(romanNumeral);
    const isValidSection = sectionMatch && (hasTierTag || !isAmbiguousSingleLetter);

    if (isValidSection) {
      console.log(`[PARSER] Found section: "${sectionMatch[2]}" tier: ${sectionMatch[3] || 'default core'}`);

      // Save previous section if exists
      if (currentSection && currentSubsections.length > 0) {
        const card = {
          title: currentSection,
          concept: formatSubsectionsAsConcept(currentSubsections),
          content: formatSubsectionsAsContent(currentSubsections)
        };
        console.log(`[PARSER] Saved card: "${card.title}" with ${currentSubsections.length} subsections, content length: ${card.content.length}`);
        if (currentTier === 'core') {
          core.push(card);
        } else {
          deep_dive.push(card);
        }
      }

      // Start new section
      currentSection = sectionMatch[2].trim();
      currentTier = sectionMatch[3]?.toLowerCase().replace(' ', '_') || 'core';
      if (currentTier === 'deep_dive') currentTier = 'deep_dive'; // normalize
      currentSubsections = [];
      continue;
    }

    // Check for subsection (A. B. C. etc)
    // Handles formats: "A. Title" or "### A. Title" (with markdown heading)
    const subsectionMatch = trimmed.match(/^(?:#{1,4}\s*)?([A-Z])\.\s+(.+)$/);
    if (subsectionMatch && currentSection) {
      currentSubsections.push({
        label: subsectionMatch[1],
        title: subsectionMatch[2],
        bullets: []
      });
      continue;
    }

    // Check for bullet point
    if (trimmed.startsWith('- ') && currentSubsections.length > 0) {
      currentSubsections[currentSubsections.length - 1].bullets.push(trimmed.substring(2));
    }
  }

  // Don't forget the last section
  if (currentSection && currentSubsections.length > 0) {
    const card = {
      title: currentSection,
      concept: formatSubsectionsAsConcept(currentSubsections),
      content: formatSubsectionsAsContent(currentSubsections)
    };
    if (currentTier === 'core') {
      core.push(card);
    } else {
      deep_dive.push(card);
    }
  }

  return { core, deep_dive, popup_terms };
}

/**
 * Format subsections into a brief concept (1-2 sentences)
 */
function formatSubsectionsAsConcept(subsections) {
  // Take first bullet from first subsection as the concept
  if (subsections.length > 0 && subsections[0].bullets.length > 0) {
    return subsections[0].bullets.slice(0, 2).join(' ');
  }
  return subsections.map(s => s.title).join('. ');
}

/**
 * Format subsections into card content (preserves outline structure)
 */
function formatSubsectionsAsContent(subsections) {
  const parts = [];

  for (const sub of subsections) {
    // Add subsection title as bold header
    let section = `**${sub.title}**`;

    // Add bullets as a list (preserving structure)
    if (sub.bullets.length > 0) {
      section += '\n' + sub.bullets.map(b => `• ${b}`).join('\n');
    }

    parts.push(section);
  }

  return parts.join('\n\n');
}

/**
 * Generate sub-decks for a topic (for infinite depth exploration)
 * Uses Wikipedia API first for real topic names, falls back to AI generation
 * @param {string} deckName - The name of the current deck (e.g., "Ancient Egypt")
 * @param {string} parentPath - The path to this deck (e.g., "History > Ancient World")
 * @param {number} depth - How deep we are (2 = sub-category, 3+ = dynamic)
 * @returns {Promise<Array<{id: string, name: string}> | null>} Array of sub-deck objects, or null if this is a leaf
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
{"subDecks": [{"id": "kebab-case-id", "name": "Display Name"}, ...], "isLeaf": false}

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
      name: deck.name || deck.title
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

Generate original educational content (80-120 words) that teaches this concept clearly.

CONTENT REQUIREMENTS:
- Length: 80-120 words (this is important - not too short, not too long)
- Structure:
  * First 1-2 sentences: Hook with something surprising or concrete
  * Middle: Explain with specific examples, numbers, facts
  * Final 1-2 sentences: Why it matters or a memorable takeaway

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

Return ONLY the text content (80-120 words):`;

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
          model: MODELS.CONTENT,
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
      model: MODELS.CONTENT,
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
    name: 'Core',
    startNumber: 1,
    guidance: `The actual lesson. After Core, someone could explain this topic to a friend and answer basic questions. Cover the essentials—what it is, why it matters, how it works.`,
  },
  deep_dive: {
    name: 'Deep Dive',
    startNumber: 11, // Starts after Core (max 10 core cards)
    guidance: `Optional bonus content for the curious. Surprising connections, historical stories, expert-level nuances, "I had no idea" moments. Reward the learner who wants more.`,
  }
};

/**
 * Generate 4-6 cards for a specific tier with streaming support
 * Card count is determined by the outline (defaults to 5 if no outline)
 * @param {string} topicName - The topic
 * @param {string} tier - 'core' | 'deep_dive'
 * @param {Array} previousCards - Cards from previous tiers (to avoid repetition)
 * @param {string} parentContext - Optional parent context
 * @param {Function} onCard - Callback fired when each card is ready (for progressive display)
 * @param {Object} outline - Optional pre-generated outline with card concepts (determines card count)
 * @returns {Promise<Array>} Array of 4-6 card objects
 */
export async function generateTierCards(topicName, tier, previousCards = [], parentContext = null, onCard = null, outline = null) {
  const config = TIER_CONFIG[tier];
  if (!config) throw new Error(`Unknown tier: ${tier}`);

  // Determine card count from outline (default to 5 for core, 3 for deep_dive if no outline)
  const tierOutline = outline?.[tier];
  const defaultCount = tier === 'core' ? 5 : 3;
  const cardCount = tierOutline?.length || defaultCount;

  console.log(`[TIER] Generating ${config.name} (${cardCount} cards) for: ${topicName}${onCard ? ' [STREAMING]' : ''}${outline ? ' [WITH OUTLINE]' : ''}`);

  // Debug: log what we received
  console.log(`[TIER] Outline received:`, outline ? 'yes' : 'no');
  console.log(`[TIER] Tier outline (${tier}):`, tierOutline ? `${tierOutline.length} items` : 'none');
  if (tierOutline && tierOutline.length > 0) {
    console.log(`[TIER] First item has content:`, !!tierOutline[0].content);
    console.log(`[TIER] First item:`, JSON.stringify(tierOutline[0], null, 2));
  }

  // NEW: If outline already has content (new detailed format), use it directly
  if (tierOutline && tierOutline.length > 0 && tierOutline[0].content) {
    console.log(`[TIER] Using pre-generated content from outline`);
    const timestamp = Date.now();
    const cards = [];

    // Process cards with delays between callbacks so React renders each one
    // (Without delays, React batches all synchronous state updates together)
    for (let index = 0; index < tierOutline.length; index++) {
      const item = tierOutline[index];
      const card = {
        id: `${topicName.toLowerCase().replace(/\s+/g, '-')}-${tier}-${index}-${timestamp}`,
        number: config.startNumber + index,
        title: item.title,
        content: item.content,
        definedTerms: [], // Could be enhanced to extract from outline.popup_terms
        tier,
        tierIndex: index,
        contentLoaded: true
      };

      cards.push(card);

      // Fire callback for each card if provided (with delays so React renders each one)
      if (onCard) {
        onCard(card, index + 1);
        // Delay after each card (except last) so React can render before next update
        if (index < tierOutline.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    console.log(`[TIER] ✅ Loaded ${cards.length} cards from outline for: ${topicName}`);
    return cards;
  }

  // LEGACY: Fall back to LLM generation if outline doesn't have content
  console.log(`[TIER] Falling back to LLM generation (outline has no content)`);

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

  // Build outline context if available
  let outlineContext = '';
  if (outline) {
    if (tierOutline && tierOutline.length > 0) {
      outlineContext = `\nPLANNED CARDS FOR THIS TIER (follow this outline exactly - generate ${tierOutline.length} cards):
${tierOutline.map((c, i) => `${i + 1}. "${c.title}": ${c.concept}`).join('\n')}

Write the full content for each of these planned cards. Use the titles and concepts as your guide.\n`;

      // Show Deep Dive coming later if generating Core
      if (tier === 'core' && outline.deep_dive) {
        outlineContext += `\nDEEP DIVE (coming later - don't cover these yet):
${outline.deep_dive.map(c => c.title).join(', ')}\n`;
      }
    }
  }

  // Use delimiters for streaming so we can parse cards as they arrive
  const prompt = `Generate ${cardCount} learning cards about "${topicName}" for ${config.name}.
${contextHint}${previousContext}${outlineContext}
FOCUS FOR THIS TIER:
${config.guidance}

Each card needs:
- "title": Clear, specific topic (4-8 words)
- "content": 50-70 words, one idea per card
- "definedTerms": Array of 0-4 terms in this card that a reader might not know. These become tappable for popup definitions. Only flag terms that are prerequisite knowledge (not the main topic being taught).

WRITING RULES:
- One idea per card. If you're using "and" or "also", you probably have two ideas.
- Short, clean sentences. No filler words.
- Build logically—each card assumes knowledge from previous cards.
- Bold **key terms** that are testable (names, dates, numbers, definitions).
- Use \\n\\n between paragraphs for readability.

TONE: Like a smart friend explaining something interesting. Confident, direct, conversational. No "Did you know?" energy.

WORD COUNT: Each card MUST be 50-70 words. Count carefully.

GOLD STANDARD EXAMPLES (note the density and clarity):

Example 1 - "What Is a Watt?" (62 words):
"A **watt** measures how fast energy flows—one **joule per second**. It's the rate of energy use, not the total amount.\\n\\nThink of it like water: watts are how fast water flows through a pipe, not how much water you have. A 100W bulb uses energy twice as fast as a 50W bulb."

Example 2 - "The Basic Equation" for Photosynthesis (58 words):
"**6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂**\\n\\nPlants take carbon dioxide and water, add sunlight, and produce sugar and oxygen. The sugar fuels the plant's growth. The oxygen is released as a byproduct—the air you're breathing right now came from this reaction."

Example 3 - "Horsepower vs Watts" (54 words):
"**1 horsepower ≈ 746 watts**. James Watt himself created the horsepower unit to sell steam engines to miners who used horses.\\n\\nHe measured how much work a horse could do, then showed his engines could match it. The comparison stuck—we still rate car engines in horsepower today."

RULES:
- Specific facts, numbers, names (not vague statements)
- Each card = one concept, fully explained
- No overlap with previous cards
- Every bolded term should be potentially quizzable
- definedTerms: Only flag prerequisite terms the reader might not know (e.g., "joule" in a card about watts). Don't flag the main concept being taught. Can be empty array if no terms need defining.

Output each card with delimiters:
###CARD###
{"number": ${config.startNumber}, "title": "...", "content": "...", "definedTerms": ["term1", "term2"]}
###END###
(continue for all ${cardCount} cards)`;

  const timestamp = Date.now();
  const allCards = [];

  try {
    // Use streaming if callback provided
    if (onCard) {
      let buffer = '';
      let cardsFound = 0;

      const stream = await anthropic.messages.create({
        model: MODELS.CONTENT,
        max_tokens: 2000, // Increased for up to 6 cards
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
                  definedTerms: card.definedTerms || [],
                  tier,
                  tierIndex: cardsFound,
                  contentLoaded: true
                };

                allCards.push(formattedCard);
                cardsFound++;
                console.log(`[TIER] 📦 Card ${cardsFound}/${cardCount} ready: ${card.title}`);

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
        model: MODELS.CONTENT,
        max_tokens: 2000, // Increased for up to 6 cards
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
            definedTerms: card.definedTerms || [],
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
              definedTerms: card.definedTerms || [],
              tier,
              tierIndex: index,
              contentLoaded: true
            });
          });
        }
      }

      if (allCards.length !== cardCount) {
        console.warn(`[TIER] Expected ${cardCount} cards, got ${allCards.length}`);
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
// POPUP DEFINITIONS: On-demand term definitions
// ============================================================================

/**
 * Generate a brief definition for a term when user taps it
 * @param {string} term - The term to define
 * @param {string} topicContext - The topic the term appears in (for context)
 * @returns {Promise<{definition: string}>}
 */
export async function generateDefinition(term, topicContext = null) {
  console.log(`[DEFINITION] Generating definition for: "${term}"${topicContext ? ` (context: ${topicContext})` : ''}`);

  const contextNote = topicContext ? ` in the context of "${topicContext}"` : '';

  const prompt = `Define "${term}"${contextNote} in ONE brief phrase or sentence.

RULES:
- Maximum 15 words
- Simple, everyday language
- Just the definition—no "X is..." or "X refers to..."
- If it's a unit, include what it measures
- If it's a person, include why they matter (2-3 words)

EXAMPLES:
- "joule" → "A unit of energy—roughly the energy to lift an apple one meter"
- "chloroplast" → "Tiny green structures inside plant cells where photosynthesis happens"
- "James Watt" → "Scottish engineer who dramatically improved the steam engine"
- "ATP" → "The molecule cells use as energy currency"
- "photon" → "A single particle of light"

Output ONLY the definition, nothing else.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast model for quick definitions
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const definition = message.content[0].text.trim();
    console.log(`[DEFINITION] ✅ "${term}" → "${definition}"`);
    return { definition };
  } catch (error) {
    console.error('[DEFINITION] Error generating definition:', error);
    throw new Error('Failed to generate definition');
  }
}

/**
 * Generate flashcards from a claimed card's content
 * Extracts multiple facts as Q&A pairs - one fact = one flashcard
 * @param {string} cardTitle - The card title (e.g., "French Revolution")
 * @param {string} cardContent - The full content of the claimed card
 * @param {Object} options - Optional: { maxCards: 10 }
 * @returns {Promise<Array<{question: string, answer: string}>>} Array of flashcard Q&As
 */
export async function generateFlashcardsFromCard(cardTitle, cardContent, options = {}) {
  const maxCards = options.maxCards || 10

  const prompt = `Extract flashcards from this learning content about "${cardTitle}".

CONTENT:
"""
${cardContent}
"""

RULES:
1. ONE fact = ONE flashcard. Extract AS MANY as the content supports (up to ${maxCards})
2. Questions should be SPECIFIC and testable
3. Answers should be CONCISE (1-2 sentences max)
4. Include numbers, dates, names where relevant
5. Vary question types: What, When, Who, Why, How, Which
6. Don't repeat information across flashcards

GOOD FLASHCARD EXAMPLES:
Q: "What year did the Storming of the Bastille occur?"
A: "1789"

Q: "What was the significance of the Tennis Court Oath?"
A: "The Third Estate swore not to disband until France had a constitution"

Q: "Who was the finance minister whose dismissal sparked riots?"
A: "Jacques Necker"

BAD FLASHCARDS (avoid):
- Too vague: "What happened in the French Revolution?"
- Too long: Multi-paragraph answers
- Not testable: "What do you think about X?"

CRITICAL: Output ONLY a valid JSON array. No explanations, no markdown, no text before or after.
Start your response with [ and end with ]

[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]`

  try {
    const message = await anthropic.messages.create({
      model: MODELS.CONTENT,  // Better quality flashcards
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = message.content[0].text.trim()

    // Parse JSON - try multiple extraction strategies
    let jsonStr = responseText

    // Strategy 1: Extract from markdown code blocks
    if (responseText.includes('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonStr = match[1].trim()
    }

    // Strategy 2: Find JSON array in the response
    if (!jsonStr.startsWith('[')) {
      const arrayMatch = responseText.match(/\[[\s\S]*\]/)
      if (arrayMatch) jsonStr = arrayMatch[0]
    }

    const flashcards = JSON.parse(jsonStr)

    // Validate structure
    if (!Array.isArray(flashcards)) {
      throw new Error('Expected array of flashcards')
    }

    const validFlashcards = flashcards.filter(fc => fc.question && fc.answer)
    console.log(`[generateFlashcardsFromCard] Generated ${validFlashcards.length} flashcards for "${cardTitle}"`)

    return validFlashcards
  } catch (error) {
    console.error('[generateFlashcardsFromCard] Error:', error)
    throw new Error('Failed to generate flashcards')
  }
}
