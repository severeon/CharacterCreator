interface DescriptionStepProps {
  appearance: string
  background: string
  onAppearanceChange: (v: string) => void
  onBackgroundChange: (v: string) => void
  onContinue: () => void
  onBack: () => void
}

export function DescriptionStep({
  appearance,
  background,
  onAppearanceChange,
  onBackgroundChange,
  onContinue,
  onBack,
}: DescriptionStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 8: Review Description Chapter</h2>
      <p className="text-gray-600">
        Take a moment to think about your character&apos;s personality, backstory, and appearance.
      </p>

      {/* Appearance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
        <textarea
          value={appearance}
          onChange={(e) => onAppearanceChange(e.target.value)}
          placeholder="Describe your character's physical appearance..."
          rows={4}
          className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
        />
      </div>

      {/* Background */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
        <textarea
          value={background}
          onChange={(e) => onBackgroundChange(e.target.value)}
          placeholder="Describe your character's history and background..."
          rows={4}
          className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
        />
      </div>

    </div>
  )
}
