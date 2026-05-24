<?php

declare(strict_types=1);

/**
 * Stage 8g.0 P2 — BlueprintInstructionAssembler tests.
 *
 * The assembler takes a structured slot document (per
 * docs/ai/structured-schema-spec.md) and renders the canonical prose
 * prompt. Tests cover each slot's render method in isolation, plus an
 * integration test using the full Innovation example from spec §4.1.
 */

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Services\AI\BlueprintInstructionAssembler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->assembler = new BlueprintInstructionAssembler;
    $this->blueprint = Blueprint::factory()->create(['name' => 'Innovation', 'slug' => 'innovation']);
});

it('returns empty string for fully empty metadata', function () {
    expect($this->assembler->assemble($this->blueprint, []))->toBe('');
});

it('renders the recognition header + lead + examples', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'recognition' => [
            'lead' => 'Route to `innovation` when a note describes something engineered.',
            'examples' => [
                'Technologies & devices: AI systems, neural interfaces',
                'Engineering: megastructures',
            ],
        ],
    ]);

    expect($output)->toContain('**WHEN A NOTE BELONGS TO THE INNOVATION BLUEPRINT:**')
        ->toContain('Route to `innovation` when a note describes something engineered.')
        ->toContain('- Technologies & devices: AI systems, neural interfaces')
        ->toContain('- Engineering: megastructures');
});

it('renders negative_examples under a "does NOT apply" subheader', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'recognition' => [
            'lead' => 'Only route when explicitly defined.',
            'examples' => ['A note like "X uses arcane forging"'],
            'negative_examples' => ['a character biography just because the character HAS the trait'],
        ],
    ]);

    expect($output)->toContain('**This does NOT apply to:**')
        ->toContain('- a character biography just because the character HAS the trait');
});

it('renders the list-type framing paragraph for reference_role', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'reference_role' => [
            'referenced_by_blueprint' => 'character',
            'referenced_by_field' => 'occupations',
        ],
    ]);

    expect($output)->toContain('This is a list-type blueprint')
        ->toContain('referenced by `character`\'s `occupations` field');
});

it('renders boundaries with vs-bullet list and (BOTH may apply) marker for dual_routing', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'boundaries' => [
            ['target' => 'discovery', 'kind' => 'exclusion', 'rule' => 'Pure observation → discovery, not innovation.'],
            ['target' => 'discovery', 'kind' => 'dual_routing', 'rule' => 'Engineered creation from a discovery → BOTH.'],
        ],
    ]);

    expect($output)->toContain('**Distinction from neighboring blueprints:**')
        ->toContain('- vs `discovery`: Pure observation → discovery, not innovation.')
        ->toContain('- vs `discovery` (BOTH may apply): Engineered creation from a discovery → BOTH.');
});

it('renders the creation section with naming/summary/note_attachment', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'creation' => [
            'naming' => 'Use the proper name.',
            'summary' => 'What it does, who made it. 1-2 sentences.',
            'note_attachment' => [
                'primary_role' => 'the innovation itself (PRIMARY subject)',
                'copy_targets' => [
                    ['blueprint_slug' => 'character', 'trigger' => 'the note mentions a Character creator'],
                ],
            ],
        ],
    ]);

    expect($output)->toContain('**Entry creation guidance:**')
        ->toContain('- **Naming:** Use the proper name.')
        ->toContain('- **Summary:** What it does, who made it. 1-2 sentences.')
        ->toContain('- **Note attachment:** `transfer_note` the original to the innovation itself (PRIMARY subject).')
        ->toContain('If the note mentions a Character creator, `copy_note` to `character` entries.');
});

it('renders structural_rules.parent with required + chain anchor + search_existing_first', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'structural_rules' => [
            'parent' => [
                'required' => true,
                'target_blueprints' => ['location'],
                'chain_anchor_hint' => 'Walk up the chain to an existing Planet.',
                'search_existing_first' => true,
            ],
        ],
    ]);

    expect($output)->toContain('**Structural requirement (parent):**')
        ->toContain('MUST have a parent of blueprint `location`')
        ->toContain('Walk up the chain to an existing Planet.')
        ->toContain('Search existing entries before creating new parents');
});

it('renders structural_rules.parent with multi-target list + selection_hint', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'structural_rules' => [
            'parent' => [
                'required' => false,
                'target_blueprints' => ['chapter', 'work'],
                'selection_hint' => 'Prefer Chapter when one exists; otherwise attach to Work.',
            ],
        ],
    ]);

    expect($output)->toContain('may have a parent of blueprint `chapter` or `work`')
        ->toContain('Prefer Chapter when one exists; otherwise attach to Work.');
});

it('omits selection_hint when only a single target_blueprint is declared', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'structural_rules' => [
            'parent' => [
                'required' => true,
                'target_blueprints' => ['location'],
                'selection_hint' => 'This should not appear — single-target.',
            ],
        ],
    ]);

    expect($output)->not->toContain('This should not appear — single-target.');
});

it('renders structural_rules.cascading_relationships as a bullet list', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'structural_rules' => [
            'cascading_relationships' => [
                ['pairing' => 'leader_of', 'target_blueprint' => 'affinity', 'trigger' => 'the note mentions a leadership role'],
                ['pairing' => 'participated_in', 'target_blueprint' => 'event', 'trigger' => 'the note describes participation'],
            ],
        ],
    ]);

    expect($output)->toContain('**Cascading relationships:**')
        ->toContain('- pairing `leader_of` with `affinity` — the note mentions a leadership role')
        ->toContain('- pairing `participated_in` with `event` — the note describes participation');
});

it('renders structural_rules.dependencies with all three creation_policy values', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'structural_rules' => [
            'dependencies' => [
                ['target_blueprint' => 'discovery', 'via_field' => 'based_on', 'creation_policy' => 'create_if_missing'],
                ['target_blueprint' => 'character', 'via_field' => 'creator', 'creation_policy' => 'must_exist'],
                ['target_blueprint' => 'affinity', 'via_field' => 'origin', 'creation_policy' => 'leave_unfilled'],
            ],
        ],
    ]);

    expect($output)->toContain('**Dependencies:**')
        ->toContain('- `based_on` → `discovery`')
        ->toContain('emit a `create_entry` command for the target')
        ->toContain('- `creator` → `character`')
        ->toContain('Only proceed if a matching entry exists')
        ->toContain('- `origin` → `affinity`')
        ->toContain('leave the field blank rather than fabricating');
});

it('renders field_pointer auto-derived from blueprint.fields', function () {
    BlueprintField::factory()->create(['blueprint_id' => $this->blueprint->id, 'name' => 'innovation_type', 'sort_order' => 1]);
    BlueprintField::factory()->create(['blueprint_id' => $this->blueprint->id, 'name' => 'creator', 'sort_order' => 2]);
    BlueprintField::factory()->create(['blueprint_id' => $this->blueprint->id, 'name' => 'status', 'sort_order' => 3]);

    $this->blueprint->load('fields');

    $output = $this->assembler->assemble($this->blueprint, [
        'recognition' => ['lead' => 'placeholder', 'examples' => []],
    ]);

    expect($output)->toContain('(Per-field guidance — innovation_type, creator, status — lives on each field\'s `ai_instruction`');
});

it('omits the field_pointer paragraph when the blueprint has no fields', function () {
    $output = $this->assembler->assemble($this->blueprint, [
        'recognition' => ['lead' => 'placeholder', 'examples' => []],
    ]);

    expect($output)->not->toContain('Per-field guidance');
});

it('silently omits missing slots without throwing or producing malformed output', function () {
    // Only recognition present; everything else absent.
    $output = $this->assembler->assemble($this->blueprint, [
        'recognition' => ['lead' => 'Lead text.', 'examples' => ['Example one.']],
    ]);

    expect($output)->toContain('**WHEN A NOTE BELONGS')
        ->not->toContain('**Distinction')
        ->not->toContain('**Entry creation')
        ->not->toContain('**Structural requirement')
        ->not->toContain('**Cascading relationships')
        ->not->toContain('**Dependencies');
});

it('assembles the full Innovation example from spec §4.1 with all sections present', function () {
    BlueprintField::factory()->create(['blueprint_id' => $this->blueprint->id, 'name' => 'innovation_type', 'sort_order' => 1]);
    BlueprintField::factory()->create(['blueprint_id' => $this->blueprint->id, 'name' => 'based_on', 'sort_order' => 2]);
    $this->blueprint->load('fields');

    $output = $this->assembler->assemble($this->blueprint, [
        'schema_version' => 1,
        'recognition' => [
            'lead' => 'Route to `innovation` when a note describes something deliberately built, engineered, created, or applied.',
            'examples' => [
                'Technologies & devices: AI systems, neural interfaces',
                'Engineering: megastructures, infrastructure',
            ],
        ],
        'boundaries' => [
            ['target' => 'discovery', 'kind' => 'exclusion', 'rule' => 'Pure observation → discovery.'],
            ['target' => 'discovery', 'kind' => 'dual_routing', 'rule' => 'Engineered creation derived from a discovery → BOTH.'],
        ],
        'creation' => [
            'naming' => 'Use the innovation\'s proper name.',
            'summary' => 'What it does, who made it, why it matters.',
            'note_attachment' => [
                'primary_role' => 'the innovation itself (PRIMARY subject)',
                'copy_targets' => [
                    ['blueprint_slug' => 'character', 'trigger' => 'the note significantly mentions a Character creator'],
                ],
            ],
        ],
        'structural_rules' => [
            'dependencies' => [
                ['target_blueprint' => 'discovery', 'via_field' => 'based_on', 'creation_policy' => 'create_if_missing'],
            ],
        ],
    ]);

    // Verify all sections rendered in the expected order.
    $sections = [
        '**WHEN A NOTE BELONGS TO THE INNOVATION BLUEPRINT:**',
        '**Distinction from neighboring blueprints:**',
        '**Entry creation guidance:**',
        '**Dependencies:**',
        '(Per-field guidance — innovation_type, based_on',
    ];

    $lastPos = -1;
    foreach ($sections as $section) {
        $pos = strpos($output, $section);
        expect($pos)->not->toBeFalse("Section '$section' should be present in output")
            ->toBeGreaterThan($lastPos, "Section '$section' should appear after the previous section");
        $lastPos = $pos;
    }
});
