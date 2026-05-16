<?php

/*
 * Theme-system UI strings — Stage 8b.
 *
 * Covers the token-override editor (M1.C.1+) and provenance badges
 * exposed via `useThemePreview()`. Preset-picker copy lives in
 * `projects.settings_tab.theme.*` since it's scoped to the Project
 * Settings → Theme tab surface.
 */

return [
    // ── Provenance badge — one badge per cascade scope ──────────────
    'provenance.system.label' => 'Theme default',
    'provenance.system.aria' => 'Inherited from the active preset',
    'provenance.user.label' => 'You',
    'provenance.user.aria' => 'Set on your user profile',
    'provenance.project.label' => 'Project',
    'provenance.project.aria' => 'Set on this project',
    'provenance.blueprint.label' => 'Blueprint',
    'provenance.blueprint.aria' => 'Set on this blueprint',
    'provenance.entry.label' => 'Entry',
    'provenance.entry.aria' => 'Set on this entry',

    // ── Token editor chrome ─────────────────────────────────────────
    'token_editor.dirty' => 'Unsaved changes',
    'token_editor.no_changes' => 'No changes',
    'token_editor.color_picker_aria' => 'Color picker',
    'token_editor.color_value_aria' => 'Color value (hex, OKLCH, or any CSS color string)',
    'token_editor.reset_tooltip' => 'Reset to inherited',
    'token_editor.reset_aria' => 'Reset this token to its inherited value',

    // ── Categories — accordion header copy ──────────────────────────
    'token_editor.category.brand.label' => 'Brand colors',
    'token_editor.category.brand.description' => 'Primary, secondary, and accent anchors used across links, buttons, and highlights.',
    'token_editor.category.status.label' => 'Status colors',
    'token_editor.category.status.description' => 'Info, success, warning, and error tones for feedback surfaces.',
    'token_editor.category.radius.label' => 'Corner radius',
    'token_editor.category.motion.label' => 'Motion',
    'token_editor.category.border.label' => 'Borders',
    'token_editor.category.shadow.label' => 'Shadows',
    'token_editor.category.surface.label' => 'Surfaces',
    'token_editor.category.neutral.label' => 'Neutral palette',
    'token_editor.category.semantic.label' => 'Links & semantic colors',
    'token_editor.category.typography.label' => 'Typography',
    'token_editor.category.effects.label' => 'Effects',
    'token_editor.category.layout.label' => 'Layout',
    'token_editor.category.placeholder' => 'Coming in a follow-up milestone — these tokens aren\'t yet editable.',
    'token_editor.category.overridden_aria' => 'Overrides set in this category',
    'token_editor.category.token_count_aria' => 'Token count in this category',
    'token_editor.leaf.editor_pending' => 'Editor pending',

    // ── Brand leaves ────────────────────────────────────────────────
    'token_editor.leaf.brand.primary.label' => 'Primary',
    'token_editor.leaf.brand.primary.description' => 'Used for buttons, links, focus rings, and the active-state highlight.',
    'token_editor.leaf.brand.secondary.label' => 'Secondary',
    'token_editor.leaf.brand.secondary.description' => 'Complements the primary on secondary actions and chrome accents.',
    'token_editor.leaf.brand.accent.label' => 'Accent',
    'token_editor.leaf.brand.accent.description' => 'Used sparingly for callouts and decorative highlights.',

    // ── Status leaves ───────────────────────────────────────────────
    'token_editor.leaf.status.info.label' => 'Info',
    'token_editor.leaf.status.success.label' => 'Success',
    'token_editor.leaf.status.warning.label' => 'Warning',
    'token_editor.leaf.status.error.label' => 'Error',
];
