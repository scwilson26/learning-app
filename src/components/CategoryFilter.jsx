import { TOPIC_CATEGORIES } from '../services/claude'

const CATEGORIES_KEY = 'selectedCategories'

// Get saved categories from localStorage
export function getSavedCategories() {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Validate that all saved IDs still exist
      return parsed.filter(id => TOPIC_CATEGORIES[id])
    }
  } catch (e) {
    console.error('Error loading categories:', e)
  }
  // Default: all categories selected
  return Object.keys(TOPIC_CATEGORIES)
}

// Save categories to localStorage
export function saveCategories(categoryIds) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categoryIds))
  } catch (e) {
    console.error('Error saving categories:', e)
  }
}

export default function CategoryFilter({ selectedCategories, onCategoriesChange }) {
  const allCategoryIds = Object.keys(TOPIC_CATEGORIES)
  const allSelected = selectedCategories.length === allCategoryIds.length

  const handleToggle = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      // Don't allow deselecting the last category
      if (selectedCategories.length === 1) return
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId))
    } else {
      onCategoriesChange([...selectedCategories, categoryId])
    }
  }

  const handleSelectAll = () => {
    if (allSelected) {
      // Select just the first category (can't have none)
      onCategoriesChange([allCategoryIds[0]])
    } else {
      onCategoriesChange(allCategoryIds)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Topics</h3>
        <button
          onClick={handleSelectAll}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {allSelected ? 'Clear' : 'Select All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {allCategoryIds.map(categoryId => {
          const category = TOPIC_CATEGORIES[categoryId]
          const isSelected = selectedCategories.includes(categoryId)
          return (
            <button
              key={categoryId}
              onClick={() => handleToggle(categoryId)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                isSelected
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                  : 'bg-gray-100 text-gray-500 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          )
        })}
      </div>
      {selectedCategories.length < allCategoryIds.length && (
        <p className="text-xs text-gray-500 mt-3">
          Rabbit holes will stay within your selected topics
        </p>
      )}
    </div>
  )
}
