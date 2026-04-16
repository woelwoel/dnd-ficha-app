import { useState } from 'react'
import { CharacterList } from './components/CharacterList'
import { CharacterSheet } from './components/CharacterSheet/CharacterSheet'
import { CharacterWizard } from './components/CharacterWizard/CharacterWizard'
import './index.css'

function App() {
  // null = lista, 'new' = wizard de criação, '<id>' = ficha existente
  const [activeCharacterId, setActiveCharacterId] = useState(null)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {activeCharacterId === null ? (
        <CharacterList
          onSelect={id => setActiveCharacterId(id)}
          onCreate={() => setActiveCharacterId('new')}
        />
      ) : activeCharacterId === 'new' ? (
        <CharacterWizard
          onBack={() => setActiveCharacterId(null)}
          onComplete={id => setActiveCharacterId(id)}
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
