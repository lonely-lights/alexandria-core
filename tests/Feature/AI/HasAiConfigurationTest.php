<?php

declare(strict_types=1);

/**
 * Polymorphic AI configuration tests covering the HasAiConfiguration trait
 * applied to Blueprint and BlueprintField. The trait's backward-compat
 * accessors (getAiPromptInstructionsAttribute on Blueprint,
 * getAiInstructionAttribute on BlueprintField) shadow the underlying
 * native columns -- those columns stay for legacy compatibility but
 * reads/writes route through the polymorphic ai_configurations table.
 */

use Alexandria\Core\Models\AiConfiguration;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an aiConfigurations polymorphic relation on Blueprint', function () {
    $blueprint = Blueprint::factory()->create();

    $config = $blueprint->setAiConfiguration(
        AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS,
        'Be concise.'
    );

    expect($config)->toBeInstanceOf(AiConfiguration::class)
        ->and($config->configurable_id)->toBe($blueprint->id)
        ->and($config->configurable_type)->toBe(Blueprint::class)
        ->and($config->instructions)->toBe('Be concise.');
});

it('reads instructions back via getAiInstructions', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'Test instruction');

    expect($blueprint->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBe('Test instruction');
});

it('returns null when no config exists for the requested type', function () {
    $blueprint = Blueprint::factory()->create();

    expect($blueprint->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBeNull()
        ->and($blueprint->getAiMetadata(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBeNull();
});

it('updates an existing config when setAiConfiguration is called twice for the same type', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'First');
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'Second');

    expect($blueprint->aiConfigurations()->count())->toBe(1)
        ->and($blueprint->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBe('Second');
});

it('respects the active scope -- inactive configs are filtered out by getAiConfiguration', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'Active');
    $blueprint->aiConfigurations()->update(['is_active' => false]);

    expect($blueprint->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBeNull();
});

it('routes Blueprint::ai_prompt_instructions reads through the polymorphic store', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'Polymorphic value');

    // The accessor shadows the native column.
    expect($blueprint->ai_prompt_instructions)->toBe('Polymorphic value');
});

it('routes Blueprint::ai_prompt_instructions writes through the polymorphic store', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->ai_prompt_instructions = 'Set via accessor';

    expect($blueprint->fresh()->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))
        ->toBe('Set via accessor');
});

it('BlueprintField uses ai_instruction accessor for metadata storage', function () {
    $field = BlueprintField::factory()->create();
    $metadata = ['priority' => 'high', 'context_triggers' => ['birth', 'death']];

    $field->ai_instruction = $metadata;

    /** @var BlueprintField $fresh */
    $fresh = $field->fresh();
    expect($fresh->ai_instruction)->toBe($metadata);
});

it('different types coexist on the same model', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS, 'BP-level');
    $blueprint->setAiConfiguration(AiConfiguration::TYPE_PROMPT_TEMPLATE, 'Template-level');

    expect($blueprint->aiConfigurations()->count())->toBe(2)
        ->and($blueprint->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS))->toBe('BP-level')
        ->and($blueprint->getAiInstructions(AiConfiguration::TYPE_PROMPT_TEMPLATE))->toBe('Template-level');
});

it('AiConfiguration scopes filter correctly', function () {
    $blueprint = Blueprint::factory()->create();
    AiConfiguration::factory()->blueprintInstructions()->create([
        'configurable_id' => $blueprint->id,
        'configurable_type' => Blueprint::class,
        'priority' => 5,
    ]);
    AiConfiguration::factory()->fieldInstructions()->inactive()->create([
        'configurable_id' => $blueprint->id,
        'configurable_type' => Blueprint::class,
        'priority' => 3,
    ]);

    expect(AiConfiguration::ofType(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS)->count())->toBe(1)
        ->and(AiConfiguration::active()->count())->toBe(1)
        ->and(AiConfiguration::byPriority()->first()->priority)->toBe(3); // ascending order, 3 first
});
