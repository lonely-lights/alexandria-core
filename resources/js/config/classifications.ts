/**
 * Blueprint classification display labels.
 * Backend values remain unchanged (standard, list, structural, relationship).
 */
export const CLASSIFICATION_LABELS: Record<string, string> = {
    standard: 'Page',
    list: 'List',
    structural: 'Structural',
    relationship: 'Relationship',
};

export function classificationLabel(value: string): string {
    return CLASSIFICATION_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}
