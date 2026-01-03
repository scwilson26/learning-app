import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate learning content about a topic
 * @param {string} topic - The topic to learn about
 * @param {string} mode - 'deeper' or 'tangent'
 * @param {string} context - Previous content for context
 * @returns {Promise<string>} Generated content
 */
export async function generateContent(topic, mode = 'initial', context = '') {
  try {
    let prompt;

    if (mode === 'initial') {
      prompt = `Explain "${topic}" in clear, accessible language.

Write 2-3 concise paragraphs:
- Use straightforward language and clear explanations
- Keep sentences relatively short
- Include an interesting example or detail
- Aim for clarity over complexity

IMPORTANT:
- Write at an accessible reading level (similar to quality journalism)
- Avoid unnecessary jargon, but don't dumb it down
- Be informative and engaging, not overly casual
- Do NOT use phrases like "super cool" or overly informal language
- Do NOT ask questions like "Would you like me to elaborate?"`;
    } else if (mode === 'deeper') {
      prompt = `The user is learning about this topic:

${context}

Provide more depth and detail. Write 2-3 concise paragraphs with additional information.

IMPORTANT:
- Use clear, straightforward language
- Break down complex ideas logically
- Keep sentences manageable
- Be informative but accessible
- Do NOT ask questions or prompt for user input.`;
    } else if (mode === 'tangent') {
      prompt = `Context:

${context}

Explore an interesting related topic - a surprising connection or related concept. Write 2-3 concise paragraphs.

IMPORTANT:
- Use clear, engaging language
- Keep it informative but accessible
- Make the connection interesting
- Avoid overly casual or informal tone
- Do NOT ask questions or prompt for user input.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to generate content. Please check your API key and try again.');
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
Start with something that creates immediate curiosity - a contradiction, mystery, or unexpected fact.

❌ NEVER use generic openings like:
- "Imagine a time when..."
- "Imagine a place where..."
- "Picture a world where..."
- "In a time before..."
- "Long ago..."

✅ ALWAYS start with a SPECIFIC, DRAMATIC fact:
- "The Praetorian Guard was supposed to protect Roman emperors. Instead, they murdered more emperors than they saved."
- "Cleopatra lived closer in time to the iPhone than to the construction of the Great Pyramid"
- "We still can't figure out how to make Roman concrete - and theirs gets stronger with time while ours crumbles"

BODY (6-8 VERY SHORT paragraphs):
Give enough to explore, but keep them hungry for MORE through hyperlinks.

CRITICAL REQUIREMENTS:
- VERY short paragraphs (2-3 sentences max)
- **Use past tense for historical events**
- End paragraphs with hooks that create curiosity - don't resolve everything
- Include gaps - plant questions but don't always answer them
- Make facts surprising or counterintuitive when possible
- Article should feel COMPLETE enough but leave details for clicking

SECTION HEADERS:
Use 1-2 headers that create curiosity (use ## markdown format).
- Make them intriguing but not clickbait
- ❌ NOT: "The 5th Century: Democracy and Philosophy"
- ✅ YES: "The Experiment That Changed Politics" or "When Citizens Became Rulers"

HYPERLINKS - CRITICAL FORMAT:
Use EXACTLY [[double brackets]] around hyperlinks. NOT single brackets [term]. ONLY [[term]].

HYPERLINK STRATEGY - COMPREHENSIVE & SPECIFIC:
- Hyperlink EVERY important concept, person, event, method, or term (8-12 per article is ideal)
- Make hyperlinks SPECIFIC and INTERESTING: not just "democracy" but "Athenian democracy", not just "slavery" but "Athenian slavery"
- Include METHODS, TECHNIQUES, SYSTEMS that are clickable: "the Socratic method", "ostracism", "trial by jury"
- Your WRITING creates curiosity, hyperlinks ensure NOTHING is missing
- The goal: Every interesting detail should be one click away

CRITICAL: Make hyperlinks SPECIFIC and UNAMBIGUOUS. Avoid generic terms that could refer to multiple things.
- ❌ NEVER: "[[Old City]]" (which Old City? Jerusalem? Philadelphia? Prague?)
- ✅ ALWAYS: "[[Old City of Jerusalem]]" or "[[Jerusalem's Old City]]"
- ❌ NEVER: "[[Temple]]" (which temple?)
- ✅ ALWAYS: "[[Second Temple]]" or "[[Temple of Jerusalem]]"
- ❌ NEVER: "[[Revolution]]" (which one?)
- ✅ ALWAYS: "[[French Revolution]]" or "[[American Revolution]]"
- ❌ NEVER: "[[dory]]" (Dory the fish from Finding Nemo or Greek spear?)
- ✅ ALWAYS: "[[dory spear]]" or "[[Greek dory]]"
- ❌ NEVER: "[[English physician]]" or "[[Roman emperor]]" (generic professions/titles - which person?)
- ✅ ALWAYS: Use the person's actual name like "[[William Harvey]]" or "[[Marcus Aurelius]]"

❌ BAD - generic, missing key concepts:
"Socrates was executed in [[Athens]] for his [[philosophical]] questioning."
(Too generic! Missing: Socratic method, trial system, hemlock, Plato, specific charges, his students)

✅ GOOD - specific, comprehensive hyperlink coverage:
"[[Socrates]] invented [[the Socratic method]] - questioning people until contradictions emerged. When he challenged powerful Athenians too often, they put him on [[trial by jury]] for [[corrupting the youth]]. He drank [[hemlock]] rather than accept exile. His student [[Plato]] documented everything in [[The Apology]]."

More examples showing SPECIFIC, INTERESTING coverage:
- "[[The Praetorian Guard]] murdered nine emperors in 200 years. They used [[poison]], [[stabbing]], and even [[public execution]]. In [[193 CE]], they literally [[auctioned the Roman throne]] to [[Didius Julianus]], who lasted 66 days before the [[Senate]] had him killed."
- "[[Roman concrete]] uses [[volcanic ash]] from [[Mount Vesuvius]] and [[seawater]] to get stronger over time. Modern concrete uses [[Portland cement]], which cracks. We've studied [[ancient Roman harbors]] for decades but still can't replicate their [[self-healing concrete]]."

CRITICAL: Include SHOCKING moments, SPECIFIC systems/methods, and ensure ALL key concepts are hyperlinked with INTERESTING phrasing. Nothing important should be un-clickable.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text;

    // Extract hyperlinks from [[term]] format
    const hyperlinkMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const hyperlinks = [...new Set(hyperlinkMatches.map(match => match.slice(2, -2)))];

    // Split into hook (first paragraph) and rest
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const hook = paragraphs[0] || '';
    const body = paragraphs.slice(1).join('\n\n');

    return { hook, content: body, hyperlinks };
  } catch (error) {
    console.error('Error generating article:', error);
    throw new Error('Failed to generate article');
  }
}

/**
 * Generate a Quick Card (2-3 sentences) for a hyperlinked term
 * @param {string} term - The term to explain
 * @param {string} context - The topic/context where this term appeared
 * @returns {Promise<{text: string, hyperlinks: Array<string>}>}
 */
export async function generateQuickCard(term, context = '') {
  try {
    const prompt = `Write a Quick Card (2-3 sentences) about "${term}"${context ? ` in the context of ${context}` : ''}.

GOAL: Create curiosity, not completion. Make them click "Go Deeper."

CRITICAL REQUIREMENTS:
- Exactly 2-3 sentences - very brief
- Lead with the MOST interesting/surprising fact
- **Use past tense for historical events**
- End with an unresolved hook or unanswered question
- Include 2-3 hyperlinks to related topics
- Don't explain everything - leave massive gaps

HYPERLINKS - CRITICAL FORMAT:
Use EXACTLY [[double brackets]] around hyperlinks. NOT single brackets [term]. ONLY [[term]].

HYPERLINK STRATEGY:
- Keep hyperlinks SIMPLE: people, places, events (1-3 words max)
- Maximum 2-3 hyperlinks total (don't overwhelm in a short card)
- Your WRITING creates curiosity, hyperlinks are just clean topics
- Include DRAMATIC moments - don't be boring!

❌ BAD - wrong format, boring:
"[Socrates] was a philosopher in [Athens]."

✅ GOOD - correct format, dramatic:
"[[Socrates]] was sentenced to death in [[399 BCE]] for corrupting youth. He chose poison over exile - drinking [[hemlock]] while discussing philosophy with his students."

Example for "Praetorian Guard":
"The [[Praetorian Guard]] murdered more emperors than they protected. In [[193 CE]], they auctioned the throne to the highest bidder, who lasted 66 days."

Write a curiosity-driving Quick Card for "${term}" with [[double brackets]] and dramatic moments:`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;

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
      model: 'claude-3-5-haiku-20241022',
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
