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
    'token_editor.text_value_aria' => 'Token value',
    'token_editor.number_value_aria' => 'Numeric value',
    'token_editor.enum_value_aria' => 'Token value (select from options)',
    'token_editor.reset_tooltip' => 'Reset to inherited',
    'token_editor.reset_aria' => 'Reset this token to its inherited value',

    // Shared shape-choice labels — reused by radius.avatar + radius.checkbox.
    'token_editor.shape.square' => 'Square',
    'token_editor.shape.rounded' => 'Rounded',
    'token_editor.shape.circle' => 'Circle',

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

    // ── Radius (M1.C.2) ─────────────────────────────────────────────
    'token_editor.category.radius.description' => 'Corner-radius vocabulary for buttons, cards, modals, and small indicators.',
    'token_editor.leaf.radius.style.label' => 'Style',
    'token_editor.leaf.radius.style.option.none' => 'None (square)',
    'token_editor.leaf.radius.style.option.sharp' => 'Sharp',
    'token_editor.leaf.radius.style.option.soft' => 'Soft',
    'token_editor.leaf.radius.style.option.rounded' => 'Rounded',
    'token_editor.leaf.radius.style.option.ornamental' => 'Ornamental',
    'token_editor.leaf.radius.button.label' => 'Button radius',
    'token_editor.leaf.radius.input.label' => 'Input radius',
    'token_editor.leaf.radius.card.label' => 'Card radius',
    'token_editor.leaf.radius.modal.label' => 'Modal radius',
    'token_editor.leaf.radius.badge.label' => 'Badge radius',
    'token_editor.leaf.radius.avatar.label' => 'Avatar shape',
    'token_editor.leaf.radius.checkbox.label' => 'Checkbox shape',

    // ── Motion (M1.C.2) ─────────────────────────────────────────────
    'token_editor.category.motion.description' => 'How animations feel — speed, character, and overall presence.',
    'token_editor.leaf.motion.style.label' => 'Style',
    'token_editor.leaf.motion.style.option.subtle' => 'Subtle',
    'token_editor.leaf.motion.style.option.standard' => 'Standard',
    'token_editor.leaf.motion.style.option.expressive' => 'Expressive',
    'token_editor.leaf.motion.intensity.label' => 'Intensity',
    'token_editor.leaf.motion.intensity.description' => '0 = static, 10 = maximum bounce / springiness.',
    'token_editor.leaf.motion.durations.fast.label' => 'Fast (twitchy feedback)',
    'token_editor.leaf.motion.durations.interactive.label' => 'Interactive (button/toggle state)',
    'token_editor.leaf.motion.durations.normal.label' => 'Normal (panel transitions)',
    'token_editor.leaf.motion.durations.slow.label' => 'Slow (deliberate reveals)',
    'token_editor.leaf.motion.easing.standard.label' => 'Standard easing',
    'token_editor.leaf.motion.easing.accelerate.label' => 'Accelerate easing',
    'token_editor.leaf.motion.easing.decelerate.label' => 'Decelerate easing',

    // ── Border (M1.C.2) ─────────────────────────────────────────────
    'token_editor.category.border.description' => 'Stroke width, style, and special visual treatments (glow, ornamental).',
    'token_editor.leaf.border.width.label' => 'Width',
    'token_editor.leaf.border.style.label' => 'Line style',
    'token_editor.leaf.border.style.option.solid' => 'Solid',
    'token_editor.leaf.border.style.option.dashed' => 'Dashed',
    'token_editor.leaf.border.style.option.dotted' => 'Dotted',
    'token_editor.leaf.border.style.option.double' => 'Double',
    'token_editor.leaf.border.treatment.label' => 'Treatment',
    'token_editor.leaf.border.treatment.description' => 'Beyond plain stroke — adds glow, inset, drop shadow, or ornamental flourishes.',
    'token_editor.leaf.border.treatment.option.none' => 'None',
    'token_editor.leaf.border.treatment.option.glow' => 'Glow',
    'token_editor.leaf.border.treatment.option.inset' => 'Inset',
    'token_editor.leaf.border.treatment.option.shadow' => 'Drop shadow',
    'token_editor.leaf.border.treatment.option.ornamental' => 'Ornamental',

    // ── Shadow (M1.C.2) ─────────────────────────────────────────────
    'token_editor.category.shadow.description' => 'Drop-shadow vocabulary and overall intensity.',
    'token_editor.leaf.shadow.style.label' => 'Style',
    'token_editor.leaf.shadow.style.option.none' => 'None',
    'token_editor.leaf.shadow.style.option.flat' => 'Flat',
    'token_editor.leaf.shadow.style.option.soft' => 'Soft',
    'token_editor.leaf.shadow.style.option.lifted' => 'Lifted',
    'token_editor.leaf.shadow.style.option.dramatic' => 'Dramatic',
    'token_editor.leaf.shadow.style.option.neon' => 'Neon',
    'token_editor.leaf.shadow.intensity.label' => 'Intensity',
    'token_editor.leaf.shadow.intensity.description' => '0 = no shadow, 10 = maximum spread/opacity.',

    // ── Surface (M1.C.2) ────────────────────────────────────────────
    'token_editor.category.surface.description' => 'Page background and the delta lightness for sunken / raised surfaces.',
    'token_editor.leaf.surface.base.label' => 'Page background',
    'token_editor.leaf.surface.base.description' => 'Dominant tone of the page chrome — every other surface derives from this.',
    'token_editor.leaf.surface.sunken_delta.label' => 'Sunken delta',
    'token_editor.leaf.surface.raised_delta.label' => 'Raised delta',

    // ── Neutral (M1.C.2) ────────────────────────────────────────────
    'token_editor.category.neutral.description' => 'Single anchor that derives the 11-step neutral palette (50 → 900 + content).',
    'token_editor.leaf.neutral.label' => 'Neutral anchor',

    // ── Semantic (M1.C.2) ───────────────────────────────────────────
    'token_editor.category.semantic.description' => 'Links, focus rings, selection, and overlay tones used across the UI.',
    'token_editor.leaf.semantic.link.label' => 'Link',
    'token_editor.leaf.semantic.link_hover.label' => 'Link hover',
    'token_editor.leaf.semantic.link_visited.label' => 'Visited link',
    'token_editor.leaf.semantic.focus_ring.label' => 'Focus ring',
    'token_editor.leaf.semantic.selection.label' => 'Text selection',
    'token_editor.leaf.semantic.overlay.label' => 'Modal overlay',
    'token_editor.leaf.semantic.scrim.label' => 'Image scrim',
];
