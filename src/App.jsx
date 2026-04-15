import { useState } from 'react'
import { CharacterList } from './components/CharacterList'
import { CharacterSheet } from './components/CharacterSheet/CharacterSheet'
import './index.css'

function App() {
  // null = character list, 'new' = create, '<id>' = edit existing
  const [activeCharacterId, setActiveCharacterId] = useState(null)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {activeCharacterId === null ? (
        <CharacterList
          onSelect={id => setActiveCharacterId(id)}
          onCreate={() => setActiveCharacterId('new')}
        />
      ) : (
        <CharacterSheet
          characterId={activeCharacterId}
          onBack={() => setActiveCharacterId(null)}
        />
      )}
    </div>
  )
}

export default App
