/**
 * Supabase client for cloud sync and authentication
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('[supabase] Client initialized for:', supabaseUrl)

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
 * Get the current user session
 * @returns {Promise<{session: Session|null, error: Error|null}>}
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Get the current user
 * @returns {Promise<{user: User|null, error: Error|null}>}
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
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
      rarity: card.rarity || 'common'
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
 * Claim a card for the current user
 * @param {string} cardId - The canonical card UUID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function claimCardRemote(cardId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: null, error: new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('user_claimed_cards')
    .upsert({
      user_id: user.id,
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
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getClaimedCardsRemote() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('user_claimed_cards')
    .select(`
      card_id,
      claimed_at,
      canonical_cards (
        id,
        topic_id,
        card_number,
        title,
        content,
        rarity
      )
    `)
    .eq('user_id', user.id)

  return { data, error }
}

/**
 * Sync local cards to Supabase (upload new cards, download missing ones)
 * @param {Object} localData - Local storage data with cards
 * @returns {Promise<{uploaded: number, downloaded: number, error: Error|null}>}
 */
export async function syncCards(localData) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { uploaded: 0, downloaded: 0, error: new Error('Not authenticated') }
  }

  let uploaded = 0
  let downloaded = 0

  try {
    // 1. Get all user's claimed cards from Supabase
    const { data: remoteClaimed, error: fetchError } = await getClaimedCardsRemote()
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
          await claimCardRemote(newCard.id)
          uploaded++
        }
      } else {
        // Card exists, just claim it if not already claimed
        const alreadyClaimed = remoteClaimed?.some(rc => rc.card_id === existingCard.id)
        if (!alreadyClaimed) {
          await claimCardRemote(existingCard.id)
          uploaded++
        }
      }
    }

    console.log(`[sync] Uploaded ${uploaded} cards, downloaded ${downloaded} cards`)
    return { uploaded, downloaded, error: null }
  } catch (error) {
    console.error('[sync] Sync failed:', error)
    return { uploaded, downloaded, error }
  }
}
