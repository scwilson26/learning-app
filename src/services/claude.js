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
      prompt = `You are a knowledgeable and engaging teacher. Explain "${topic}" in a clear, interesting way.

Write 2-3 paragraphs that:
- Start with the core concept in simple terms
- Include a fascinating detail or example
- Make the reader curious to learn more

Keep it conversational and engaging.`;
    } else if (mode === 'deeper') {
      prompt = `The user is learning about this topic:

${context}

Go deeper into this same topic. Explain more technical details, mechanisms, or advanced concepts. Write 2-3 engaging paragraphs.`;
    } else if (mode === 'tangent') {
      prompt = `The user just learned about:

${context}

Take them on an interesting tangent to a related but unexpected topic. Find a surprising connection or related concept that would fascinate them. Write 2-3 engaging paragraphs about this new direction.`;
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
 * Generate a flashcard question and answer from content
 * @param {string} content - The content to create a flashcard from
 * @returns {Promise<{question: string, answer: string}>} Flashcard Q&A
 */
export async function generateFlashcard(content) {
  try {
    const prompt = `Based on this learning content, create ONE flashcard question and answer:

${content}

Format your response EXACTLY as:
Q: [question here]
A: [answer here]

Make the question test understanding, not just memorization.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const response = message.content[0].text;

    // Parse the response
    const qMatch = response.match(/Q:\s*(.+?)(?=\nA:)/s);
    const aMatch = response.match(/A:\s*(.+)/s);

    if (qMatch && aMatch) {
      return {
        question: qMatch[1].trim(),
        answer: aMatch[1].trim()
      };
    } else {
      throw new Error('Failed to parse flashcard response');
    }
  } catch (error) {
    console.error('Error generating flashcard:', error);
    throw new Error('Failed to generate flashcard');
  }
}
