interface TextFormProps {
  config: { fields: string[] }
  values: Record<string, string>
  onChange: (field: string, value: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Character Name',
  player_name: 'Player Name',
  alignment: 'Alignment',
  deity: 'Deity',
  height: 'Height',
  weight: 'Weight',
  age: 'Age',
  eyes: 'Eye Color',
  hair: 'Hair Color',
  skin: 'Skin Color',
  appearance: 'Appearance',
  background: 'Background',
  notes: 'Notes',
}

export function TextForm({ config, values, onChange }: TextFormProps) {
  return (
    <div className="space-y-4">
      {config.fields.map((field) => {
        const label = FIELD_LABELS[field] ?? field
        const isLong = field === 'appearance' || field === 'background' || field === 'notes'
        return (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {isLong ? (
              <textarea
                value={values[field] ?? ''}
                onChange={(e) => onChange(field, e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type="text"
                value={values[field] ?? ''}
                onChange={(e) => onChange(field, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
