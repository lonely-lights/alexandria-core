import { useState } from 'react';
import type { BlueprintField } from '@alexandria/types/blueprints';

function toSnake(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Shared field management logic for blueprint field editors.
 * Used by both the Structure tab and the Settings modal fields panel.
 */
export function useBlueprintFields(initialFields: BlueprintField[]) {
    const [fields, setFields] = useState<BlueprintField[]>(
        initialFields.map((f, i) => ({ ...f, sort_order: i }))
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    function addField() {
        const newField: BlueprintField = {
            id: null,
            label: '',
            name: '',
            type: 'text',
            description: null,
            is_required: false,
            validation_rules: {},
            sort_order: fields.length,
        };
        setFields((prev) => [...prev, newField]);
        setExpandedIndex(fields.length);
    }

    function removeField(index: number) {
        setFields((prev) => prev.filter((_, i) => i !== index));
        setExpandedIndex(null);
    }

    function moveField(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= fields.length) return;
        setFields((prev) => {
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next.map((f, i) => ({ ...f, sort_order: i }));
        });
        setExpandedIndex(target);
    }

    function updateField(index: number, updates: Partial<BlueprintField>) {
        setFields((prev) => prev.map((f, i) => {
            if (i !== index) return f;
            const updated = { ...f, ...updates };
            if (updates.label !== undefined && (!f.name || f.name === toSnake(f.label))) {
                updated.name = toSnake(updates.label);
            }
            return updated;
        }));
    }

    function updateValidationRule(index: number, key: string, value: unknown) {
        setFields((prev) => prev.map((f, i) => {
            if (i !== index) return f;
            return { ...f, validation_rules: { ...f.validation_rules, [key]: value } };
        }));
    }

    function reorderFields(oldIndex: number, newIndex: number) {
        if (oldIndex === newIndex) return;
        setFields((prev) => {
            const next = [...prev];
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            return next.map((f, i) => ({ ...f, sort_order: i }));
        });
        setExpandedIndex(null);
    }

    function resetFields(newFields: BlueprintField[]) {
        setFields(newFields.map((f, i) => ({ ...f, sort_order: i })));
        setExpandedIndex(null);
    }

    return {
        fields,
        expandedIndex,
        setExpandedIndex,
        addField,
        removeField,
        moveField,
        reorderFields,
        updateField,
        updateValidationRule,
        resetFields,
    };
}
