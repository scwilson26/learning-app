import { useState, useEffect } from 'react'

// Fun facts to show while loading
const funFacts = [
  // Original facts
  "Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "Octopuses have three hearts and blue blood.",
  "A group of flamingos is called a 'flamboyance.'",
  "Bananas are berries, but strawberries aren't.",
  "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "There are more possible chess games than atoms in the observable universe.",
  "Wombat poop is cube-shaped.",
  "The inventor of the Pringles can is buried in one.",
  "A day on Venus is longer than a year on Venus.",
  "Sharks existed before trees.",
  "The voice actors for Mickey and Minnie Mouse got married in real life.",
  "Oxford University is older than the Aztec Empire.",
  "The national animal of Scotland is the unicorn.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The moon has moonquakes.",
  "Cows have best friends and get stressed when separated.",
  "The first oranges weren't orange - they were green.",
  "A cloud can weigh more than a million pounds.",
  "Your brain uses about 20% of your total energy.",
  // Space & Astronomy
  "Neutron stars are so dense that a teaspoon would weigh about 6 billion tons.",
  "There's a planet made of diamonds twice the size of Earth.",
  "Space smells like seared steak and hot metal, according to astronauts.",
  "The footprints on the Moon will last for 100 million years.",
  "Saturn would float if you could find a bathtub big enough.",
  "A year on Mercury is just 88 Earth days.",
  "The Sun makes up 99.86% of our solar system's mass.",
  "There are more stars in the universe than grains of sand on Earth.",
  "Light from the Sun takes 8 minutes to reach Earth.",
  "Olympus Mons on Mars is nearly three times the height of Mount Everest.",
  // Animals
  "A snail can sleep for three years.",
  "Elephants are the only animals that can't jump.",
  "A shrimp's heart is in its head.",
  "Slugs have four noses.",
  "Dolphins sleep with one eye open.",
  "A crocodile can't stick its tongue out.",
  "Koalas sleep up to 22 hours a day.",
  "Butterflies taste with their feet.",
  "A group of owls is called a 'parliament.'",
  "Hummingbirds are the only birds that can fly backwards.",
  "Cats have over 20 vocalizations, including the meow.",
  "Sea otters hold hands while sleeping to keep from drifting apart.",
  "A blue whale's heart is the size of a small car.",
  "Crows can recognize human faces and hold grudges.",
  "Tardigrades can survive in space.",
  // History
  "Ancient Romans used crushed mouse brains as toothpaste.",
  "Cleopatra spoke nine languages and was the first Ptolemy ruler to learn Egyptian.",
  "Vikings used the bones of slain animals to make their instruments.",
  "The Great Wall of China is not visible from space with the naked eye.",
  "Napoleon was actually average height for his time—5'7\".",
  "Ancient Egyptians used slabs of stone as pillows.",
  "The Colosseum had a retractable roof made of canvas.",
  "Ketchup was sold as medicine in the 1830s.",
  "The first computer programmer was a woman: Ada Lovelace.",
  "Albert Einstein was offered the presidency of Israel in 1952.",
  // Science
  "Hot water freezes faster than cold water under certain conditions.",
  "Glass is actually a liquid that flows very, very slowly.",
  "Humans share 60% of their DNA with bananas.",
  "Your stomach lining replaces itself every 3-4 days.",
  "Lightning strikes Earth about 8 million times per day.",
  "Antibiotics have no effect on viruses.",
  "The human nose can detect over 1 trillion different scents.",
  "Sound travels about 4 times faster in water than in air.",
  "A single bolt of lightning contains enough energy to toast 100,000 slices of bread.",
  "The average person walks about 100,000 miles in their lifetime.",
  // Geography
  "Russia has 11 time zones.",
  "Canada has more lakes than the rest of the world combined.",
  "Australia is wider than the Moon.",
  "The Amazon rainforest produces 20% of the world's oxygen.",
  "There's a town in Norway called 'Hell' that freezes over every winter.",
  "The Dead Sea is so salty you can float without trying.",
  "Mount Everest grows about 4mm taller each year.",
  "Africa is the only continent in all four hemispheres.",
  "Vatican City is the smallest country in the world.",
  "The Sahara Desert is roughly the same size as the United States.",
  // Language & Culture
  "There are more English speakers in China than in the United States.",
  "The sentence 'The quick brown fox jumps over the lazy dog' uses every letter of the alphabet.",
  "The word 'set' has the most definitions in the English dictionary.",
  "Japanese has three different writing systems.",
  "The ampersand (&) was once the 27th letter of the English alphabet.",
  "Shakespeare invented over 1,700 words we still use today.",
  "Hawaiian has only 12 letters in its alphabet.",
  "The word 'nerd' was first coined by Dr. Seuss.",
  // Technology
  "The first computer mouse was made of wood.",
  "Email existed before the World Wide Web.",
  "The first webcam was invented to monitor a coffee pot at Cambridge.",
  "More people have cell phones than have toilets.",
  "The QWERTY keyboard was designed to slow typists down.",
  "Nintendo was founded in 1889 as a playing card company.",
  "The first alarm clock could only ring at 4 AM.",
  "92% of the world's currency exists only digitally.",
  // Human Body
  "Your eyes are always the same size from birth, but your nose and ears never stop growing.",
  "Humans are the only animals that blush.",
  "The human body contains enough iron to make a 3-inch nail.",
  "Your brain generates enough electricity to power a small light bulb.",
  "The strongest muscle in the human body is the tongue.",
  "Humans are bioluminescent, but the light is too weak for our eyes to see.",
  "Fingernails grow nearly 4 times faster than toenails.",
  "The human skeleton is completely replaced every 10 years.",
  // Miscellaneous
  "A 'moment' was a medieval unit of time equal to 90 seconds.",
  "The inventor of the frisbee was turned into a frisbee after he died.",
  "Competitive art used to be an Olympic sport.",
  "The shortest complete sentence in English is 'I am.'",
  "A chef's hat traditionally has 100 folds.",
  "The longest hiccuping spree lasted 68 years.",
  "Bubble wrap was originally invented as wallpaper.",
  "The Eiffel Tower can grow 6 inches taller in summer heat.",
  "The hashtag symbol is technically called an octothorpe.",
  "A group of porcupines is called a 'prickle.'",
]

const RECENT_FACTS_KEY = 'recentFacts'
const HISTORY_SIZE = 20 // Remember last 20 facts to avoid repeats

// Get a random fact that hasn't been shown recently
function getRandomFact() {
  let recentIndices = []
  try {
    const saved = localStorage.getItem(RECENT_FACTS_KEY)
    if (saved) recentIndices = JSON.parse(saved)
  } catch (e) {
    // Ignore localStorage errors
  }

  // Get available indices (not recently shown)
  let available = []
  for (let i = 0; i < funFacts.length; i++) {
    if (!recentIndices.includes(i)) {
      available.push(i)
    }
  }

  // If we've shown too many, reset but keep last few
  if (available.length === 0) {
    recentIndices = recentIndices.slice(-5)
    available = []
    for (let i = 0; i < funFacts.length; i++) {
      if (!recentIndices.includes(i)) {
        available.push(i)
      }
    }
  }

  // Pick random from available
  const randomIdx = available[Math.floor(Math.random() * available.length)]

  // Save to history
  recentIndices.push(randomIdx)
  if (recentIndices.length > HISTORY_SIZE) {
    recentIndices = recentIndices.slice(-HISTORY_SIZE)
  }
  try {
    localStorage.setItem(RECENT_FACTS_KEY, JSON.stringify(recentIndices))
  } catch (e) {
    // Ignore localStorage errors
  }

  return funFacts[randomIdx]
}

export default function LoadingFacts() {
  const [currentFact, setCurrentFact] = useState(() => getRandomFact())
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setFadeIn(false)

      // After fade out, change fact and fade in
      setTimeout(() => {
        setCurrentFact(getRandomFact())
        setFadeIn(true)
      }, 300)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="my-8 max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>

      <div
        className={`text-center transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      >
        <p className="text-gray-600 text-sm mb-2">Did you know?</p>
        <p className="text-gray-800 font-medium leading-relaxed px-4">
          {currentFact}
        </p>
      </div>
    </div>
  )
}
