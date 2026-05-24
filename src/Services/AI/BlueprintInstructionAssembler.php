<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Models\System\Blueprint;

/**
 * Assembles a Blueprint's structured AI sorting instructions into the
 * canonical prose prompt format consumed by Stage 1/2 agents.
 *
 * Schema spec: alexandria-app/docs/ai/structured-schema-spec.md (v2).
 * Stored shape: ai_configurations.metadata JSON column when present;
 * legacy free-form ai_configurations.instructions column otherwise.
 *
 * The assembler is invoked by HasAiConfiguration::getAiPromptInstructionsAttribute()
 * when metadata is present on the Blueprint's TYPE_BLUEPRINT_INSTRUCTIONS row;
 * if metadata is absent, the trait returns the legacy free-form text without
 * touching this service.
 *
 * Missing slots are silently omitted from the rendered prose — better than
 * throwing or producing malformed output. A blueprint with partial metadata
 * still produces a coherent (if shorter) prompt.
 */
final class BlueprintInstructionAssembler
{
    /**
     * Render structured slot metadata into the canonical prose prompt.
     *
     * @param  array<string, mixed>  $metadata  The structured slot document
     */
    public function assemble(Blueprint $blueprint, array $metadata): string
    {
        $sections = array_filter([
            $this->renderRecognition(
                $blueprint,
                $metadata['recognition'] ?? null,
                $metadata['reference_role'] ?? null,
            ),
            $this->renderBoundaries($metadata['boundaries'] ?? []),
            $this->renderCreation($metadata['creation'] ?? null),
            $this->renderStructuralRules($metadata['structural_rules'] ?? null),
            $this->renderFieldPointer($blueprint),
        ], fn (string $section): bool => $section !== '');

        return implode("\n\n", $sections);
    }

    /**
     * §3.1 — "WHEN A NOTE BELONGS" header + lead paragraph + examples.
     *
     * For list-type blueprints (those with a `reference_role` slot), the
     * reference-role framing paragraph renders as the FIRST paragraph after
     * the header — matches the legacy "Occupation is a list-type blueprint
     * — its entries exist to be referenced by..." flow where the framing
     * contextualizes WHY the routing rules are so narrow.
     *
     * @param  array<string, mixed>|null  $recognition
     * @param  array<string, mixed>|null  $referenceRole
     */
    private function renderRecognition(Blueprint $blueprint, ?array $recognition, ?array $referenceRole = null): string
    {
        if ($recognition === null && $referenceRole === null) {
            return '';
        }

        $name = mb_strtoupper($blueprint->name);
        $lines = ["**WHEN A NOTE BELONGS TO THE $name BLUEPRINT:**"];

        $referenceParagraph = $this->renderReferenceRole($referenceRole);
        if ($referenceParagraph !== '') {
            $lines[] = '';
            $lines[] = $referenceParagraph;
        }

        if ($recognition === null) {
            return implode("\n", $lines);
        }

        $lead = trim((string) ($recognition['lead'] ?? ''));
        if ($lead !== '') {
            $lines[] = '';
            $lines[] = $lead;
        }

        $examples = $recognition['examples'] ?? [];
        if (is_array($examples) && $examples !== []) {
            $lines[] = '';
            foreach ($examples as $example) {
                $lines[] = '- '.trim((string) $example);
            }
        }

        $negative = $recognition['negative_examples'] ?? [];
        if (is_array($negative) && $negative !== []) {
            $lines[] = '';
            $lines[] = '**This does NOT apply to:**';
            $lines[] = '';
            foreach ($negative as $item) {
                $lines[] = '- '.trim((string) $item);
            }
        }

        return implode("\n", $lines);
    }

    /**
     * §3.3 — list-type framing paragraph.
     *
     * @param  array<string, mixed>|null  $reference
     */
    private function renderReferenceRole(?array $reference): string
    {
        if ($reference === null) {
            return '';
        }

        $blueprint = trim((string) ($reference['referenced_by_blueprint'] ?? ''));
        $field = trim((string) ($reference['referenced_by_field'] ?? ''));

        if ($blueprint === '' || $field === '') {
            return '';
        }

        return sprintf(
            'This is a list-type blueprint — its entries exist to be referenced by `%s`\'s `%s` field, not to be the primary subject of a note.',
            $blueprint,
            $field,
        );
    }

    /**
     * §3.2 — "Distinction from neighboring blueprints" header + rules list.
     *
     * Renders both exclusion and dual_routing rules in a single flat list.
     * dual_routing rules are visually distinguished with a "(BOTH may apply)"
     * suffix prefix so the AI sees the intent without losing the structure.
     *
     * @param  list<array<string, mixed>>  $boundaries
     */
    private function renderBoundaries(array $boundaries): string
    {
        if ($boundaries === []) {
            return '';
        }

        $lines = ['**Distinction from neighboring blueprints:**', ''];

        foreach ($boundaries as $boundary) {
            $target = trim((string) ($boundary['target'] ?? ''));
            $kind = (string) ($boundary['kind'] ?? 'exclusion');
            $rule = trim((string) ($boundary['rule'] ?? ''));

            if ($target === '' || $rule === '') {
                continue;
            }

            $marker = $kind === 'dual_routing' ? ' (BOTH may apply)' : '';
            $lines[] = sprintf('- vs `%s`%s: %s', $target, $marker, $rule);
        }

        return implode("\n", $lines);
    }

    /**
     * §3.4 — "Entry creation guidance" header + naming/summary/note_attachment.
     *
     * @param  array<string, mixed>|null  $creation
     */
    private function renderCreation(?array $creation): string
    {
        if ($creation === null) {
            return '';
        }

        $lines = ['**Entry creation guidance:**', ''];

        $naming = trim((string) ($creation['naming'] ?? ''));
        if ($naming !== '') {
            $lines[] = '- **Naming:** '.$naming;
        }

        $summary = trim((string) ($creation['summary'] ?? ''));
        if ($summary !== '') {
            $lines[] = '- **Summary:** '.$summary;
        }

        $attachment = $creation['note_attachment'] ?? null;
        if (is_array($attachment)) {
            $primary = trim((string) ($attachment['primary_role'] ?? ''));
            $copyTargets = $attachment['copy_targets'] ?? [];
            $validCopyTargets = is_array($copyTargets)
                ? array_filter(
                    $copyTargets,
                    fn ($t): bool => is_array($t)
                        && trim((string) ($t['blueprint_slug'] ?? '')) !== ''
                        && trim((string) ($t['trigger'] ?? '')) !== '',
                )
                : [];

            if ($primary !== '') {
                if ($validCopyTargets === []) {
                    $lines[] = "- **Note attachment:** `transfer_note` the original to $primary.";
                } else {
                    $lines[] = "- **Note attachment:** `transfer_note` the original to $primary. Also `copy_note` to:";
                    foreach ($validCopyTargets as $target) {
                        $slug = trim((string) $target['blueprint_slug']);
                        $trigger = trim((string) $target['trigger']);
                        $lines[] = sprintf('  - `%s` — when %s', $slug, $trigger);
                    }
                }
            }
        }

        $relationships = $creation['relationships'] ?? null;
        if (is_array($relationships)) {
            $guidance = trim((string) ($relationships['guidance'] ?? ''));
            if ($guidance !== '') {
                $lines[] = '- **Relationships:** '.$guidance;
            }
        }

        return count($lines) > 2 ? implode("\n", $lines) : '';
    }

    /**
     * §3.5 — structural_rules sub-slot rendering. Three sub-sections (parent,
     * cascading_relationships, dependencies), each optional.
     *
     * @param  array<string, mixed>|null  $rules
     */
    private function renderStructuralRules(?array $rules): string
    {
        if ($rules === null) {
            return '';
        }

        $sections = array_filter([
            $this->renderParentRule($rules['parent'] ?? null),
            $this->renderCascadingRelationships($rules['cascading_relationships'] ?? []),
            $this->renderDependencies($rules['dependencies'] ?? []),
        ], fn (string $s): bool => $s !== '');

        return implode("\n\n", $sections);
    }

    /**
     * §3.5.1 — parent_id constraint rendering.
     *
     * @param  array<string, mixed>|null  $parent
     */
    private function renderParentRule(?array $parent): string
    {
        if ($parent === null) {
            return '';
        }

        $targets = $parent['target_blueprints'] ?? [];
        if (! is_array($targets) || $targets === []) {
            return '';
        }

        $required = (bool) ($parent['required'] ?? false);
        $verb = $required ? 'MUST' : 'may';

        $targetList = count($targets) === 1
            ? sprintf('`%s`', $targets[0])
            : implode(' or ', array_map(fn ($t): string => sprintf('`%s`', $t), $targets));

        $lines = [
            sprintf('**Structural requirement (parent):** Every entry %s have a parent of blueprint %s.', $verb, $targetList),
        ];

        $hint = trim((string) ($parent['selection_hint'] ?? ''));
        if ($hint !== '' && count($targets) > 1) {
            $lines[] = '';
            $lines[] = $hint;
        }

        $anchor = trim((string) ($parent['chain_anchor_hint'] ?? ''));
        if ($anchor !== '') {
            $lines[] = '';
            $lines[] = $anchor;
        }

        if (($parent['search_existing_first'] ?? false) === true) {
            $lines[] = '';
            $lines[] = 'Search existing entries before creating new parents — do not create duplicates.';
        }

        return implode("\n", $lines);
    }

    /**
     * §3.5.2 — cascading_relationships sub-slot rendering.
     *
     * @param  list<array<string, mixed>>  $cascading
     */
    private function renderCascadingRelationships(array $cascading): string
    {
        if ($cascading === []) {
            return '';
        }

        $lines = ['**Cascading relationships:** When creating this entry, also emit `create_relationship` commands for the following pairings when the trigger condition is met:', ''];

        foreach ($cascading as $rule) {
            $pairing = trim((string) ($rule['pairing'] ?? ''));
            $target = trim((string) ($rule['target_blueprint'] ?? ''));
            $trigger = trim((string) ($rule['trigger'] ?? ''));

            if ($pairing === '' || $target === '' || $trigger === '') {
                continue;
            }

            $lines[] = sprintf('- pairing `%s` with `%s` — %s', $pairing, $target, $trigger);
        }

        return count($lines) > 2 ? implode("\n", $lines) : '';
    }

    /**
     * §3.5.3 — dependencies sub-slot rendering.
     *
     * @param  list<array<string, mixed>>  $dependencies
     */
    private function renderDependencies(array $dependencies): string
    {
        if ($dependencies === []) {
            return '';
        }

        $lines = ['**Dependencies:** This entry references other blueprints via specific fields:', ''];

        foreach ($dependencies as $dep) {
            $target = trim((string) ($dep['target_blueprint'] ?? ''));
            $field = trim((string) ($dep['via_field'] ?? ''));
            $policy = (string) ($dep['creation_policy'] ?? 'leave_unfilled');

            if ($target === '' || $field === '') {
                continue;
            }

            $policyText = match ($policy) {
                'create_if_missing' => 'If no matching entry exists, emit a `create_entry` command for the target before creating this one.',
                'must_exist' => 'Only proceed if a matching entry exists; otherwise flag the note as unresolvable.',
                'leave_unfilled' => 'If no matching entry exists, leave the field blank rather than fabricating one.',
                default => '',
            };

            $line = sprintf('- `%s` → `%s`', $field, $target);
            if ($policyText !== '') {
                $line .= ' ('.$policyText.')';
            }
            $lines[] = $line;
        }

        return count($lines) > 2 ? implode("\n", $lines) : '';
    }

    /**
     * §3.6 — the closing per-field-pointer parenthetical.
     *
     * Derived from `blueprint.fields()` at render time — not stored in metadata.
     * Returns empty string when the blueprint has no fields (skips the
     * paragraph rather than rendering "Per-field guidance — — lives...").
     */
    private function renderFieldPointer(Blueprint $blueprint): string
    {
        $fieldNames = $blueprint->fields->pluck('name')->filter()->values();

        if ($fieldNames->isEmpty()) {
            return '';
        }

        return sprintf(
            '(Per-field guidance — %s — lives on each field\'s `ai_instruction` and is consumed by the future entry-enrichment pass, not by sorting.)',
            $fieldNames->implode(', '),
        );
    }
}
