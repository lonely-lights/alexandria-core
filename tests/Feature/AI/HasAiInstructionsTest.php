<?php

declare(strict_types=1);

/**
 * HasAiInstructions trait tests on Blueprint. The trait wraps
 * $this->ai_prompt_instructions which routes through HasAiConfiguration's
 * polymorphic accessor — so set/get round-trip via the polymorphic
 * ai_configurations table, not a native column.
 *
 * On Blueprint, the method name conflict between HasAiInstructions::getAiInstructions()
 * and HasAiConfiguration::getAiInstructions(string $type) is resolved via PHP trait
 * conflict resolution: HasAiInstructions::getAiInstructions is aliased to
 * getPromptInstructions() on Blueprint. Tests use getPromptInstructions().
 *
 * @noinspection PhpUndefinedMethodInspection
 */

use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('hasAiInstructions returns false when no instructions are set', function () {
    $blueprint = Blueprint::factory()->create();
    expect($blueprint->hasAiInstructions())->toBeFalse();
});

it('setAiInstructions stores instructions and getPromptInstructions retrieves them', function () {
    $blueprint = Blueprint::factory()->create();
    $blueprint->setAiInstructions('Be concise.');

    expect($blueprint->fresh()->getPromptInstructions())->toBe('Be concise.')
        ->and($blueprint->fresh()->hasAiInstructions())->toBeTrue();
});

it('getDefaultAiInstructions returns classification-specific defaults', function () {
    $standard = Blueprint::factory()->create(['classification' => 'standard']);
    $list = Blueprint::factory()->create(['classification' => 'list']);
    $relationship = Blueprint::factory()->create(['classification' => 'relationship']);

    expect($standard->getDefaultAiInstructions())->toContain('standard')
        ->and($list->getDefaultAiInstructions())->toContain('list')
        ->and($relationship->getDefaultAiInstructions())->toContain('relationship');
});

it('getEffectiveAiInstructions returns custom instructions when set, default otherwise', function () {
    $blueprint = Blueprint::factory()->create(['classification' => 'standard']);

    expect($blueprint->getEffectiveAiInstructions())->toContain('standard'); // default

    $blueprint->setAiInstructions('Custom voice.');

    expect($blueprint->fresh()->getEffectiveAiInstructions())->toBe('Custom voice.');
});
