export interface ViewPreferences {
    font_size?: string;
    reduced_motion?: boolean;
    compact_mode?: boolean;
    show_section_type_labels?: boolean;
    high_contrast?: boolean;
    focus_indicators?: string;
    dyslexia_friendly_font?: boolean;
}

export const VIEW_PREFERENCES_CHANGED_EVENT = 'alexandria-core:view-preferences-changed';

/**
 * Mirror a (partial) preferences object onto <html> as data-* attributes.
 * Used for optimistic UI updates when the user changes a preference —
 * the init-script handles the server-rendered case.
 */
export function applyViewPreferences(prefs: ViewPreferences): void {
    const html = document.documentElement;

    if (prefs.font_size !== undefined) {
        html.setAttribute('data-font-size', prefs.font_size);
    }
    if (prefs.focus_indicators !== undefined) {
        html.setAttribute('data-focus-indicators', prefs.focus_indicators);
    }
    if (prefs.reduced_motion !== undefined) {
        if (prefs.reduced_motion) html.setAttribute('data-reduced-motion', 'true');
        else html.removeAttribute('data-reduced-motion');
    }
    if (prefs.compact_mode !== undefined) {
        if (prefs.compact_mode) html.setAttribute('data-compact', 'true');
        else html.removeAttribute('data-compact');
    }
    if (prefs.show_section_type_labels !== undefined) {
        html.setAttribute('data-show-section-type-labels', String(prefs.show_section_type_labels));
    }
    if (prefs.high_contrast !== undefined) {
        if (prefs.high_contrast) html.setAttribute('data-high-contrast', 'true');
        else html.removeAttribute('data-high-contrast');
    }
    if (prefs.dyslexia_friendly_font !== undefined) {
        if (prefs.dyslexia_friendly_font) html.setAttribute('data-dyslexia', 'true');
        else html.removeAttribute('data-dyslexia');
    }

    window.dispatchEvent(new CustomEvent(VIEW_PREFERENCES_CHANGED_EVENT, { detail: prefs }));
}
