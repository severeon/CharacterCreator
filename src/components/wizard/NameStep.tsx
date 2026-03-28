interface NameStepProps {
  characterName: string
  playerName: string
  alignment: string
  deity: string
  height: string
  weight: string
  age: string
  eyes: string
  hair: string
  skin: string
  appearance: string
  background: string
  onCharacterNameChange: (v: string) => void
  onPlayerNameChange: (v: string) => void
  onAlignmentChange: (v: string) => void
  onDeityChange: (v: string) => void
  onHeightChange: (v: string) => void
  onWeightChange: (v: string) => void
  onAgeChange: (v: string) => void
  onEyesChange: (v: string) => void
  onHairChange: (v: string) => void
  onSkinChange: (v: string) => void
  onAppearanceChange: (v: string) => void
  onBackgroundChange: (v: string) => void
  onStartCreation: () => void
}

const ALIGNMENTS: [string, string, string][] = [
  ['lawful-good', 'Lawful Good', 'LG'],
  ['neutral-good', 'Neutral Good', 'NG'],
  ['chaotic-good', 'Chaotic Good', 'CG'],
  ['lawful-neutral', 'Lawful Neutral', 'LN'],
  ['neutral', 'Neutral', 'N'],
  ['chaotic-neutral', 'Chaotic Neutral', 'CN'],
  ['lawful-evil', 'Lawful Evil', 'LE'],
  ['neutral-evil', 'Neutral Evil', 'NE'],
  ['chaotic-evil', 'Chaotic Evil', 'CE'],
]

export function NameStep({
  characterName,
  playerName,
  alignment,
  deity,
  height,
  weight,
  age,
  eyes,
  hair,
  skin,
  appearance,
  background,
  onCharacterNameChange,
  onPlayerNameChange,
  onAlignmentChange,
  onDeityChange,
  onHeightChange,
  onWeightChange,
  onAgeChange,
  onEyesChange,
  onHairChange,
  onSkinChange,
  onAppearanceChange,
  onBackgroundChange,
  onStartCreation,
}: NameStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Character Identity</h2>

      {/* Basic Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => onCharacterNameChange(e.target.value)}
            placeholder="Enter character name..."
            className="w-full px-4 py-2 border rounded-lg"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Your name..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Alignment Grid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
        <div className="inline-grid grid-cols-3 gap-1 border border-gray-300 rounded-lg p-1 bg-gray-50">
          {ALIGNMENTS.map(([value, label, abbrev]) => (
            <button
              key={value}
              type="button"
              onClick={() => onAlignmentChange(value)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                alignment === value
                  ? 'bg-blue-600 text-white font-medium'
                  : 'hover:bg-gray-200'
              }`}
            >
              <span className="block text-xs opacity-75">{abbrev}</span>
              <span className="block text-xs">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Deity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deity</label>
        <input
          type="text"
          value={deity}
          onChange={(e) => onDeityChange(e.target.value)}
          placeholder="Your deity (optional)..."
          className="w-full max-w-md px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Physical Characteristics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            placeholder="e.g. 72"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            placeholder="e.g. 180"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="e.g. 25"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Eyes</label>
          <input
            type="text"
            value={eyes}
            onChange={(e) => onEyesChange(e.target.value)}
            placeholder="Eye color..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hair</label>
          <input
            type="text"
            value={hair}
            onChange={(e) => onHairChange(e.target.value)}
            placeholder="Hair color..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skin</label>
          <input
            type="text"
            value={skin}
            onChange={(e) => onSkinChange(e.target.value)}
            placeholder="Skin tone..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Appearance & Background */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
        <textarea
          value={appearance}
          onChange={(e) => onAppearanceChange(e.target.value)}
          placeholder="Describe your character's physical appearance..."
          rows={3}
          className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
        <textarea
          value={background}
          onChange={(e) => onBackgroundChange(e.target.value)}
          placeholder="Describe your character's history and background..."
          rows={3}
          className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
        />
      </div>

      <button
        onClick={onStartCreation}
        disabled={!characterName.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        Start Creating
      </button>
    </div>
  )
}
