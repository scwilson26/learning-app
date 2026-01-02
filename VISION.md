# Learning Rabbit Hole App - Vision

## Core Concept
An AI-powered learning app that combines serendipitous exploration (rabbit holes) with effective retention (spaced repetition flashcards).

## The Problem
Learning is hard. People consume information but don't retain it. Traditional flashcard apps are boring. Wikipedia rabbit holes are fun but you forget everything.

This app makes learning both engaging AND effective.

## User Flow (MVP - 3 Screens)

### Screen 1: Home
- Simple text input: "What do you want to learn about?"
- Submit button
- That's it. No navigation, no settings, no profile.

### Screen 2: Learn (The Rabbit Hole)
- Shows AI-generated content about the topic (text paragraphs)
- Three buttons at bottom:
  - "Go deeper" - continues down current topic
  - "Take a tangent" - branches to related but unexpected topic
  - "Save & continue" - saves current content as flashcard, continues exploring
- Indicator showing how many cards saved (e.g., "5 cards saved")
- This screen updates with new content - user stays on same screen throughout exploration

### Screen 3: Review
- Shows saved flashcards one at a time
- Question/Answer format
- "Show answer" button
- Rate difficulty: Easy / Medium / Hard
- Uses spaced repetition algorithm to schedule next review

## Tech Stack
- React + Tailwind (responsive web app, works on mobile/desktop)
- Claude API for content generation
- Local storage for MVP (no accounts yet)

## Core Principles
- Keep it simple - no over-engineering
- Focus on functionality over aesthetics for MVP
- Build iteratively - get basic version working first

## Future Features (NOT in MVP)
- PDF upload → auto-generate outline + flashcards
- Visualize the rabbit hole journey
- User accounts and cloud sync
- More sophisticated spaced repetition algorithm
- Social/sharing features

## Success Criteria for MVP
Can I (the creator) use this to learn something new and actually retain it better than just reading Wikipedia?