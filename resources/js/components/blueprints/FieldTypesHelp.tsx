import { FIELD_TYPES } from '@alexandria/config/fieldTypes';

const FIELD_TYPE_HELP = [
    { type: 'text', desc: 'A single line of text for short values like names or labels.', examples: 'Nickname, Motto, Species' },
    { type: 'textarea', desc: 'A longer block of text for descriptions, notes, or detailed content.', examples: 'Biography, Physical Description' },
    { type: 'integer', desc: 'A whole number for quantities, rankings, or countable values.', examples: 'Age, Population, Floor Count' },
    { type: 'boolean', desc: 'A yes/no toggle for binary states or flags.', examples: 'Is Alive, Has Magic, Is Published' },
    { type: 'date', desc: 'A calendar date for events, milestones, or specific days.', examples: 'Date of Birth, Founded On' },
    { type: 'datetime', desc: 'A date with a specific time, for when the exact moment matters.', examples: 'Time of Death, Launch Time' },
    { type: 'entry_reference', desc: 'A link to an entry from another blueprint. Select from a list of entries to connect data together.', examples: 'Gender, Occupation, Location Type' },
    { type: 'relationship_manager', desc: 'A connection manager for complex, bidirectional links that carry their own data between two entries.', examples: 'Character Relationships, Scene-Event Links' },
    { type: 'temporal', desc: 'A value that changes over time. Stores multiple records, each with a start date, optional end date, intensity, and notes. Use for anything with a duration.', examples: 'Career History, Motivations, Residences, Education' },
];

export default function FieldTypesHelp() {
    return (
        <div className="space-y-3">
            {FIELD_TYPE_HELP.map((ft) => {
                const config = FIELD_TYPES[ft.type];
                if (!config) return null;
                return (
                    <div key={ft.type} className="flex gap-3 rounded-xl border border-base-content/10 p-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-base-300/50`}>
                            <i className={`${config.icon} text-sm ${config.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="text-sm font-semibold">{config.label}</span>
                            <p className="mt-0.5 text-xs text-base-content/60">{ft.desc}</p>
                            <p className="mt-1 text-xs text-base-content/40">
                                <span className="font-medium">Examples:</span> {ft.examples}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
