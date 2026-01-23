/**
 * Supabase client for cloud sync and authentication
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

console.log('[supabase] Client initialized for:', supabaseUrl)

// Handle auth callback from magic link (URL hash contains access_token)
if (window.location.hash.includes('access_token')) {
  console.log('[supabase] Detected auth callback in URL, processing...')
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('[supabase] Error processing auth callback:', error)
    } else if (data.session) {
      console.log('[supabase] Auth callback processed, user signed in')
      // Clear the hash from URL for cleaner UX
      window.history.replaceState(null, '', window.location.pathname)
    }
  })
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Sign up / sign in with magic link (passwordless email)
 * @param {string} email - User's email address
 * @returns {Promise<{error: Error|null}>}
 */
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  })
  return { error }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: Error|null}>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with (event, session) on auth changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ============================================================================
// CARD SYNC
// ============================================================================

/**
 * Upsert a canonical card (create if not exists, update if exists)
 * @param {Object} card - Card data { topic_id, card_number, title, content, rarity }
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function upsertCanonicalCard(card) {
  const { data, error } = await supabase
    .from('canonical_cards')
    .upsert({
      topic_id: card.topic_id,
      card_number: card.card_number,
      title: card.title,
      content: card.content,
      rarity: card.rarity || 'common',
      tier: card.tier || 'core'
    }, {
      onConflict: 'topic_id,card_number'
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get a canonical card by topic and card number
 * @param {string} topicId - The topic ID
 * @param {number} cardNumber - Card number (1-16)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getCanonicalCard(topicId, cardNumber) {
  const { data, error } = await supabase
    .from('canonical_cards')
    .select('*')
    .eq('topic_id', topicId)
    .eq('card_number', cardNumber)
    .single()

  return { data, error }
}

/**
 * Get all canonical cards for a topic
 * @param {string} topicId - The topic ID
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getCanonicalCardsForTopic(topicId) {
  const { data, error } = await supabase
    .from('canonical_cards')
    .select('*')
    .eq('topic_id', topicId)
    .order('card_number')

  return { data, error }
}

/**
 * Get preview card for a topic (card_number = 0)
 * @param {string} topicId - The topic ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getPreviewCardRemote(topicId) {
  const { data, error } = await supabase
    .from('canonical_cards')
    .select('*')
    .eq('topic_id', topicId)
    .eq('card_number', 0)
    .single()

  return { data, error }
}

/**
 * Save preview card to Supabase (card_number = 0)
 * @param {string} topicId - The topic ID
 * @param {string} title - The topic name
 * @param {string} content - The preview content
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function savePreviewCardRemote(topicId, title, content) {
  const { data, error } = await supabase
    .from('canonical_cards')
    .upsert({
      topic_id: topicId,
      card_number: 0,
      title: title,
      content: content,
      rarity: 'common',
      tier: 'preview'
    }, {
      onConflict: 'topic_id,card_number'
    })
    .select()
    .single()

  return { data, error }
}

// ============================================================================
// TOPIC OUTLINES
// ============================================================================

/**
 * Get outline for a topic
 * @param {string} topicId - The topic ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getOutline(topicId) {
  const { data, error } = await supabase
    .from('topic_outlines')
    .select('*')
    .eq('topic_id', topicId)
    .single()

  return { data, error }
}

/**
 * Save outline for a topic
 * @param {string} topicId - The topic ID
 * @param {Object} outline - The outline JSON { core: [...], deep_dive_1: [...], deep_dive_2: [...] }
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function saveOutline(topicId, outline) {
  const { data, error } = await supabase
    .from('topic_outlines')
    .upsert({
      topic_id: topicId,
      outline_json: outline
    }, {
      onConflict: 'topic_id'
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Claim a card for the current user
 * @param {string} cardId - The canonical card UUID
 * @param {string} userId - Optional user ID to use directly
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function claimCardRemote(cardId, userId = null) {
  let uid = userId
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser()
    uid = user?.id
  }
  if (!uid) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('user_claimed_cards')
    .upsert({
      user_id: uid,
      card_id: cardId
    }, {
      onConflict: 'user_id,card_id'
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get all claimed cards for the current user
 * @param {string} userId - Optional user ID to use directly
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getClaimedCardsRemote(userId = null) {
  let uid = userId
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser()
    uid = user?.id
  }
  if (!uid) {
    return { data: [], error: null }
  }

  try {
    // Use fetch directly (Supabase client has issues with auth token handling)
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_claimed_cards?user_id=eq.${uid}&select=*`
    const response = await fetch(url, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return { data: data || [], error: null }
  } catch (err) {
    console.error('[getClaimedCardsRemote] Exception:', err)
    return { data: [], error: err }
  }
}

/**
 * Sync local cards to Supabase (upload new cards, download missing ones)
 * @param {Object} localData - Local storage data with cards
 * @returns {Promise<{uploaded: number, downloaded: number, error: Error|null}>}
 */
export async function syncCards(localData, sessionUser = null) {

  // Use passed user or get from session
  let user = sessionUser
  if (!user) {
    const { data: { session } } = await supabase.auth.getSession()
    user = session?.user
  }

  if (!user) {
    return { uploaded: 0, downloaded: 0, error: new Error('Not authenticated') }
  }

  let uploaded = 0
  let downloaded = 0

  try {
    // 1. Get all user's claimed cards from Supabase
    const { data: remoteClaimed, error: fetchError } = await getClaimedCardsRemote(user.id)
    if (fetchError) throw fetchError

    // 2. Upload local cards that aren't in Supabase
    const localCards = Object.values(localData.cards || {}).filter(c => c.claimed)

    for (const localCard of localCards) {
      // Check if this card exists remotely
      const { data: existingCard } = await getCanonicalCard(localCard.deckId, localCard.number || 1)

      if (!existingCard) {
        // Create the canonical card
        const { data: newCard, error: createError } = await upsertCanonicalCard({
          topic_id: localCard.deckId,
          card_number: localCard.number || 1,
          title: localCard.title,
          content: localCard.content,
          rarity: localCard.rarity || 'common'
        })

        if (createError) {
          console.error('[sync] Error creating card:', createError)
          continue
        }

        // Claim the card for this user
        if (newCard) {
          await claimCardRemote(newCard.id, user.id)
          uploaded++
        }
      } else {
        // Card exists, just claim it if not already claimed
        const alreadyClaimed = remoteClaimed?.some(rc => rc.card_id === existingCard.id)
        if (!alreadyClaimed) {
          await claimCardRemote(existingCard.id, user.id)
          uploaded++
        }
      }
    }

    return { uploaded, downloaded, error: null }
  } catch (error) {
    return { uploaded, downloaded, error }
  }
}

// ============================================================================
// FLASHCARD SYNC (Spaced Repetition)
// ============================================================================

/**
 * Get all flashcards for a user from Supabase
 * @param {string} userId - Optional user ID (falls back to session)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function getFlashcardsRemote(userId = null) {
  try {
    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) {
      return { data: [], error: null } // Not authenticated, return empty
    }

    const { data, error } = await supabase
      .from('user_flashcards')
      .select('*')
      .eq('user_id', uid)

    if (error) {
      console.error('[getFlashcardsRemote] Error:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('[getFlashcardsRemote] Error:', error)
    return { data: [], error }
  }
}

/**
 * Upsert a single flashcard to Supabase
 * @param {Object} flashcard - Flashcard object from local storage
 * @param {string} userId - Optional user ID (falls back to session)
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function upsertFlashcardRemote(flashcard, userId = null) {
  try {
    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) {
      return { data: null, error: new Error('Not authenticated') }
    }

    const { data, error } = await supabase
      .from('user_flashcards')
      .upsert({
        user_id: uid,
        flashcard_id: flashcard.id,
        question: flashcard.question,
        answer: flashcard.answer,
        source_card_id: flashcard.sourceCardId,
        source_card_title: flashcard.sourceCardTitle,
        next_review: flashcard.nextReview,
        interval: flashcard.interval,
        ease_factor: flashcard.easeFactor,
        repetitions: flashcard.repetitions,
        status: flashcard.status,
        created_at: flashcard.createdAt,
        last_reviewed_at: flashcard.lastReviewedAt
      }, {
        onConflict: 'user_id,flashcard_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[upsertFlashcardRemote] Error:', error)
    }

    return { data, error }
  } catch (error) {
    console.error('[upsertFlashcardRemote] Error:', error)
    return { data: null, error }
  }
}

/**
 * Upsert multiple flashcards to Supabase (batch)
 * @param {Array} flashcards - Array of flashcard objects
 * @param {string} userId - Optional user ID (falls back to session)
 * @returns {Promise<{data: Array, error: Error, count: number}>}
 */
export async function upsertFlashcardsRemote(flashcards, userId = null) {
  try {
    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) {
      return { data: null, error: new Error('Not authenticated'), count: 0 }
    }

    if (!flashcards || flashcards.length === 0) {
      return { data: [], error: null, count: 0 }
    }

    // Transform to database format
    const dbFlashcards = flashcards.map(fc => ({
      user_id: uid,
      flashcard_id: fc.id,
      question: fc.question,
      answer: fc.answer,
      source_card_id: fc.sourceCardId,
      source_card_title: fc.sourceCardTitle,
      next_review: fc.nextReview,
      interval: fc.interval,
      ease_factor: fc.easeFactor,
      repetitions: fc.repetitions,
      status: fc.status,
      created_at: fc.createdAt,
      last_reviewed_at: fc.lastReviewedAt
    }))

    const { data, error } = await supabase
      .from('user_flashcards')
      .upsert(dbFlashcards, {
        onConflict: 'user_id,flashcard_id'
      })
      .select()

    if (error) {
      console.error('[upsertFlashcardsRemote] Error:', error)
      return { data: null, error, count: 0 }
    }

    console.log(`[upsertFlashcardsRemote] Upserted ${data?.length || 0} flashcards`)
    return { data, error: null, count: data?.length || 0 }
  } catch (error) {
    console.error('[upsertFlashcardsRemote] Error:', error)
    return { data: null, error, count: 0 }
  }
}

/**
 * Sync flashcards between local storage and Supabase
 * - Pushes local flashcards to remote
 * - Pulls remote flashcards to local
 * - Merges conflicts by keeping the one with newer lastReviewedAt
 * @param {Object} localFlashcards - Object of flashcardId -> flashcard from localStorage
 * @param {Object} sessionUser - Optional user object from session
 * @returns {Promise<{uploaded: number, downloaded: number, merged: number, error: Error}>}
 */
export async function syncFlashcards(localFlashcards, sessionUser = null) {
  let uploaded = 0
  let downloaded = 0
  let merged = 0

  try {
    // Get user
    let user = sessionUser
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user
    }
    if (!user) {
      return { uploaded, downloaded, merged, error: new Error('Not authenticated') }
    }

    // 1. Fetch all remote flashcards
    const { data: remoteFlashcards, error: fetchError } = await getFlashcardsRemote(user.id)
    if (fetchError) {
      return { uploaded, downloaded, merged, error: fetchError }
    }

    // Create a map of remote flashcards by flashcard_id
    const remoteMap = new Map()
    for (const rf of remoteFlashcards) {
      remoteMap.set(rf.flashcard_id, rf)
    }

    // 2. Process local flashcards
    const localArray = Object.values(localFlashcards || {})
    const toUpload = []
    const toMergeLocal = [] // Remote is newer, update local

    for (const local of localArray) {
      const remote = remoteMap.get(local.id)

      if (!remote) {
        // Local only - upload to remote
        toUpload.push(local)
      } else {
        // Exists in both - compare lastReviewedAt
        const localReview = local.lastReviewedAt ? new Date(local.lastReviewedAt) : new Date(0)
        const remoteReview = remote.last_reviewed_at ? new Date(remote.last_reviewed_at) : new Date(0)

        if (localReview > remoteReview) {
          // Local is newer - upload to remote
          toUpload.push(local)
        } else if (remoteReview > localReview) {
          // Remote is newer - will update local
          toMergeLocal.push(remote)
        }
        // If equal, no action needed
      }
    }

    // 3. Find remote-only flashcards (to download)
    const localIds = new Set(localArray.map(l => l.id))
    const toDownload = remoteFlashcards.filter(rf => !localIds.has(rf.flashcard_id))

    // 4. Upload local flashcards to remote
    if (toUpload.length > 0) {
      const { count, error: uploadError } = await upsertFlashcardsRemote(toUpload, user.id)
      if (!uploadError) {
        uploaded = count
      }
    }

    // 5. Return data for local storage update
    // The caller (Canvas.jsx) will handle updating local storage
    const flashcardsToImport = [
      ...toDownload.map(rf => ({
        id: rf.flashcard_id,
        question: rf.question,
        answer: rf.answer,
        sourceCardId: rf.source_card_id,
        sourceCardTitle: rf.source_card_title,
        nextReview: rf.next_review,
        interval: rf.interval,
        easeFactor: parseFloat(rf.ease_factor),
        repetitions: rf.repetitions,
        status: rf.status,
        createdAt: rf.created_at,
        lastReviewedAt: rf.last_reviewed_at
      })),
      ...toMergeLocal.map(rf => ({
        id: rf.flashcard_id,
        question: rf.question,
        answer: rf.answer,
        sourceCardId: rf.source_card_id,
        sourceCardTitle: rf.source_card_title,
        nextReview: rf.next_review,
        interval: rf.interval,
        easeFactor: parseFloat(rf.ease_factor),
        repetitions: rf.repetitions,
        status: rf.status,
        createdAt: rf.created_at,
        lastReviewedAt: rf.last_reviewed_at
      }))
    ]

    downloaded = toDownload.length
    merged = toMergeLocal.length

    console.log(`[syncFlashcards] Uploaded: ${uploaded}, Downloaded: ${downloaded}, Merged: ${merged}`)

    return {
      uploaded,
      downloaded,
      merged,
      flashcardsToImport,
      error: null
    }
  } catch (error) {
    console.error('[syncFlashcards] Error:', error)
    return { uploaded, downloaded, merged, error }
  }
}
