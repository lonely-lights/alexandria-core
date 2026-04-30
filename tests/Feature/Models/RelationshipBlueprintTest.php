<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a relationship blueprint between two blueprints', function () {
    $from = Blueprint::factory()->create();
    $to = Blueprint::factory()->create();

    $rel = RelationshipBlueprint::factory()->create([
        'from_blueprint_id' => $from->id,
        'to_blueprint_id' => $to->id,
        'relationship_name' => 'Home',
    ]);

    expect($rel->from_blueprint_id)->toBe($from->id)
        ->and($rel->to_blueprint_id)->toBe($to->id)
        ->and($rel->relationship_name)->toBe('Home');
});

it('belongs to fromBlueprint and toBlueprint', function () {
    $rel = RelationshipBlueprint::factory()->create();

    expect($rel->fromBlueprint)->toBeInstanceOf(Blueprint::class)
        ->and($rel->toBlueprint)->toBeInstanceOf(Blueprint::class);
});

it('forBlueprint returns relationships from either side', function () {
    $a = Blueprint::factory()->create();
    $b = Blueprint::factory()->create();
    $c = Blueprint::factory()->create();

    RelationshipBlueprint::factory()->between($a, $b)->create();
    RelationshipBlueprint::factory()->between($c, $a)->create();
    RelationshipBlueprint::factory()->between($b, $c)->create(); // unrelated to A

    $forA = RelationshipBlueprint::forBlueprint($a);

    expect($forA)->toHaveCount(2);
});

it('shouldTriggerForContent matches case-insensitively against context_triggers', function () {
    $rel = RelationshipBlueprint::factory()->create([
        'context_triggers' => ['lives in', 'resides'],
    ]);

    expect($rel->shouldTriggerForContent('Aragorn LIVES IN the Shire'))->toBeTrue()
        ->and($rel->shouldTriggerForContent('No match here'))->toBeFalse();
});

it('shouldTriggerForContent returns false when context_triggers is null or empty', function () {
    $rel = RelationshipBlueprint::factory()->create(['context_triggers' => null]);
    expect($rel->shouldTriggerForContent('any content'))->toBeFalse();
});

it('soft-deletes a relationship blueprint', function () {
    $rel = RelationshipBlueprint::factory()->create();
    $rel->delete();

    /** @var RelationshipBlueprint $fresh */
    $fresh = $rel->fresh();
    expect($fresh->trashed())->toBeTrue();
});
