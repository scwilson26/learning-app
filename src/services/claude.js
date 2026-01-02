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
      prompt = `You are a friendly teacher explaining "${topic}" to a curious learner.

Write 2-3 short paragraphs using simple, conversational language:
- Use short sentences and common words
- Explain like you're talking to a friend
- Include a cool example or interesting fact
- Keep it engaging but easy to read

IMPORTANT:
- Write at a high school reading level
- Avoid complex vocabulary and jargon
- Use everyday language
- Do NOT ask questions like "Would you like me to elaborate?" - just provide the information directly.`;
    } else if (mode === 'deeper') {
      prompt = `The user is learning about this topic:

${context}

Go a bit deeper, but keep it simple and readable. Write 2-3 short paragraphs explaining more details.

IMPORTANT:
- Use simple, clear language
- Break complex ideas into easy-to-understand pieces
- Short sentences work better than long ones
- Avoid overly technical terms when possible
- Do NOT ask questions or prompt for user input.`;
    } else if (mode === 'tangent') {
      prompt = `Context:

${context}

Take the user to an interesting related topic - something surprising or unexpected. Write 2-3 short paragraphs about this connection.

IMPORTANT:
- Use simple, conversational language
- Keep sentences short and clear
- Make it feel like a fun discovery
- Avoid complex vocabulary
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
