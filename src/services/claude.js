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
 * Generate comprehensive multi-section content about a topic
 * @param {string} topic - The topic to deeply explore
 * @param {Function} onProgress - Callback for progress updates (sectionIndex, totalSections, sectionTitle)
 * @returns {Promise<string>} Complete multi-section content
 */
export async function generateDeepDive(topic, onProgress = () => {}) {
  try {
    // First, generate an outline
    const outlinePrompt = `Create a comprehensive outline for learning about "${topic}".

Generate 5-6 section titles that cover the topic thoroughly, like a complete Wikipedia article would.

Format EXACTLY as:
1. [Section title]
2. [Section title]
3. [Section title]
...

Keep titles clear and specific. Cover: introduction, history/background, key concepts, important details, impact/legacy, and related topics.`;

    const outlineMessage = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [{ role: 'user', content: outlinePrompt }]
    });

    const outlineText = outlineMessage.content[0].text;

    // Parse section titles
    const sectionMatches = outlineText.match(/\d+\.\s*(.+)/g);
    if (!sectionMatches || sectionMatches.length === 0) {
      throw new Error('Failed to generate outline');
    }

    const sections = sectionMatches.map(line => line.replace(/^\d+\.\s*/, '').trim());

    // Generate content for each section
    let fullContent = `# ${topic}\n\n`;

    for (let i = 0; i < sections.length; i++) {
      const sectionTitle = sections[i];
      onProgress(i + 1, sections.length, sectionTitle);

      const sectionPrompt = `Write a comprehensive section about "${sectionTitle}" as part of an article about ${topic}.

Write 3-4 detailed paragraphs that thoroughly cover this aspect of the topic.

IMPORTANT:
- Use clear, straightforward language (quality journalism style)
- Be thorough and informative
- Include specific details, examples, and context
- Keep sentences manageable but don't oversimplify
- Do NOT ask questions or prompt for user input`;

      const sectionMessage = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: sectionPrompt }]
      });

      const sectionContent = sectionMessage.content[0].text;
      fullContent += `## ${sectionTitle}\n\n${sectionContent}\n\n`;
    }

    return fullContent;
  } catch (error) {
    console.error('Error generating deep dive:', error);
    throw new Error('Failed to generate comprehensive content');
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
