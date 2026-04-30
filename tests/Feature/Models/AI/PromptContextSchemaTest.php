<?php

declare(strict_types=1);

use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a schema with type+version+json_schema', function () {
    $schema = PromptContextSchema::factory()->create([
        'type' => 'TestContext',
        'version' => '1.0',
    ]);

    expect($schema->type)->toBe('TestContext')
        ->and($schema->version)->toBe('1.0')
        ->and($schema->json_schema)->toBeArray();
});

it('findByTypeAndVersion returns the matching schema', function () {
    PromptContextSchema::factory()->create(['type' => 'A', 'version' => '1.0']);
    PromptContextSchema::factory()->create(['type' => 'A', 'version' => '2.0']);

    $found = PromptContextSchema::findByTypeAndVersion('A', '2.0');
    expect($found?->version)->toBe('2.0')
        ->and(PromptContextSchema::findByTypeAndVersion('A', '99.0'))->toBeNull();
});

it('latestForType returns the highest version', function () {
    PromptContextSchema::factory()->create(['type' => 'A', 'version' => '1.0']);
    PromptContextSchema::factory()->create(['type' => 'A', 'version' => '3.0']);
    PromptContextSchema::factory()->create(['type' => 'A', 'version' => '2.0']);

    expect(PromptContextSchema::latestForType('A')?->version)->toBe('3.0');
});

it('validate flags missing required properties', function () {
    $schema = PromptContextSchema::factory()->create([
        'json_schema' => [
            'required' => ['name'],
            'properties' => ['name' => ['type' => 'string']],
        ],
    ]);

    $missing = $schema->validate(['other' => 'value']);
    expect($missing['valid'])->toBeFalse()
        ->and($missing['errors'])->toHaveCount(1);

    $present = $schema->validate(['name' => 'foo']);
    expect($present['valid'])->toBeTrue();
});

it('validate flags type mismatches', function () {
    $schema = PromptContextSchema::factory()->create([
        'json_schema' => [
            'properties' => ['count' => ['type' => 'integer']],
        ],
    ]);

    $bad = $schema->validate(['count' => 'not an int']);
    expect($bad['valid'])->toBeFalse();
});

it('templates() returns matching PromptTemplate rows', function () {
    $schema = PromptContextSchema::factory()->create(['type' => 'CtxA', 'version' => '1.0']);
    PromptTemplate::factory()->create(['required_context_type' => 'CtxA', 'context_schema_version' => '1.0']);
    PromptTemplate::factory()->create(['required_context_type' => 'CtxA', 'context_schema_version' => '1.0']);
    PromptTemplate::factory()->create(['required_context_type' => 'OtherContext', 'context_schema_version' => '1.0']);

    expect($schema->templates())->toHaveCount(2);
});
