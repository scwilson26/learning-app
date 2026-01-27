import { useState, useEffect } from 'react'
import Canvas from './components/Canvas'
import { TilesDemo } from './components/TilesDemo'

function App() {
  // Check URL for ?demo=tiles
  const [showTilesDemo, setShowTilesDemo] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'tiles') {
      setShowTilesDemo(true)
    }
  }, [])

  if (showTilesDemo) {
    return <TilesDemo />
  }

  return <Canvas />
}

export default App
