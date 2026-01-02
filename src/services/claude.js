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
 * Generate outline with intro paragraph for a topic
 * @param {string} topic - The topic to explore
 * @returns {Promise<{intro: string, sections: string[]}>} Intro paragraph and section titles
 */
export async function generateOutline(topic) {
  try {
    const outlinePrompt = `Create a comprehensive outline for "${topic}".

First, write a brief 2-3 sentence introduction paragraph that provides essential context (who/what/when/where/why this topic matters).

Then, generate section titles that cover the topic thoroughly, like a Wikipedia article. Use as many sections as needed - no limit. Each section should cover one specific aspect.

Format EXACTLY as:

INTRO:
[2-3 sentence introduction]

SECTIONS:
1. [Section title]
2. [Section title]
3. [Section title]
...

Include relevant sections like: overview, historical context, key concepts, significant events/details, impact/legacy, related topics, etc.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: outlinePrompt }]
    });

    const response = message.content[0].text;

    // Parse intro
    const introMatch = response.match(/INTRO:\s*(.+?)(?=SECTIONS:)/s);
    if (!introMatch) {
      throw new Error('Failed to parse introduction');
    }
    const intro = introMatch[1].trim();

    // Parse sections
    const sectionsMatch = response.match(/SECTIONS:\s*(.+)/s);
    if (!sectionsMatch) {
      throw new Error('Failed to parse sections');
    }

    const sectionMatches = sectionsMatch[1].match(/\d+\.\s*(.+)/g);
    if (!sectionMatches || sectionMatches.length === 0) {
      throw new Error('Failed to parse section titles');
    }

    const sections = sectionMatches.map(line => line.replace(/^\d+\.\s*/, '').trim());

    return { intro, sections };
  } catch (error) {
    console.error('Error generating outline:', error);
    throw new Error('Failed to generate outline');
  }
}

/**
 * Generate content for a specific section
 * @param {string} topic - The main topic
 * @param {string} sectionTitle - The section to generate content for
 * @returns {Promise<string>} Section content
 */
export async function generateSection(topic, sectionTitle) {
  try {
    const sectionPrompt = `Write the "${sectionTitle}" section for an article on ${topic}.

IMPORTANT: This is one section within a larger article. The introduction already covered who/what/when/where basics. Do NOT re-introduce ${topic}. Jump straight into the specific content for "${sectionTitle}".

Use a mix of paragraphs and bullet points for readability. Make it scannable like Wikipedia.

Format guidelines:
- Start with 1-2 short paragraphs of key context (specific to this section)
- Use bullet points for lists, multiple items, or key facts
- Use **bold** for important names, terms, dates
- Break up dense information - vary the format
- Think: "How would Wikipedia present this?"

Content requirements:
- Factual, direct, informative
- Include specific facts, dates, examples
- Clear, efficient sentences - no filler
- Every sentence adds new information
- No adjectives like "remarkable," "extraordinary," "profound"
- No redundant phrases like "not only...but also"
- Do NOT ask questions or prompt for user input

Be thorough but succinct. Make it easy to scan and absorb.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: sectionPrompt }]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Error generating section:', error);
    throw new Error('Failed to generate section content');
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
