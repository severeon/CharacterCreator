import type { Entity } from '../../lib/types'
import { AlignmentGrid } from './AlignmentGrid'
import { DeitySelector } from './DeitySelector'
import { AgePicker } from './AgePicker'
import { ColorPicker, EYE_COLORS, HAIR_COLORS, SKIN_COLORS } from './ColorPicker'

interface DetailsStepProps {
  characterName: string
  playerName: string
  alignment: string
  deity: string
  height: string
  weight: string
  age: number
  eyes: string
  hair: string
  skin: string
  selectedRace: Entity | null
  unlocked?: boolean
  onCharacterNameChange: (v: string) => void
  onPlayerNameChange: (v: string) => void
  onAlignmentChange: (v: string) => void
  onDeityChange: (v: string) => void
  onHeightChange: (v: string) => void
  onWeightChange: (v: string) => void
  onAgeChange: (v: number) => void
  onEyesChange: (v: string) => void
  onHairChange: (v: string) => void
  onSkinChange: (v: string) => void
}

export function DetailsStep({
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
  selectedRace,
  unlocked = false,
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
}: DetailsStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Name row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label className="dnd-field-label">Character Name</label>
          <input
            type="text"
            value={characterName}
            onChange={(e) => onCharacterNameChange(e.target.value)}
            placeholder="Enter character name…"
            className="dnd-field-input"
            autoFocus
          />
        </div>
        <div>
          <label className="dnd-field-label">Player Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Your name…"
            className="dnd-field-input"
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <div className="dnd-field-label" style={{ marginBottom: '0.5rem' }}>Alignment</div>
        <AlignmentGrid value={alignment} onChange={onAlignmentChange} unlocked={unlocked} />
      </div>

      {/* Deity */}
      <DeitySelector value={deity} onChange={onDeityChange} />

      {/* Physical stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label className="dnd-field-label">Height</label>
          <input
            type="text"
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            placeholder="e.g. 5′10″"
            className="dnd-field-input"
          />
        </div>
        <div>
          <label className="dnd-field-label">Weight</label>
          <input
            type="text"
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            placeholder="e.g. 175 lbs"
            className="dnd-field-input"
          />
        </div>
      </div>

      {/* Age */}
      <div>
        <div className="dnd-field-label" style={{ marginBottom: '0.5rem' }}>Age</div>
        <AgePicker value={age} race={selectedRace} onChange={onAgeChange} unlocked={unlocked} />
      </div>

      {/* Color pickers */}
      <ColorPicker palette={EYE_COLORS} value={eyes} onChange={onEyesChange} label="Eye Color" />
      <ColorPicker palette={HAIR_COLORS} value={hair} onChange={onHairChange} label="Hair Color" />
      <ColorPicker palette={SKIN_COLORS} value={skin} onChange={onSkinChange} label="Skin Tone" />

    </div>
  )
}
