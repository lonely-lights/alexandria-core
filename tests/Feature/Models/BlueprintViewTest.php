<?php

declare(strict_types=1);

use Alexandria\Core\Models\BlueprintView;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a blueprint view scoped to a blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    $view = BlueprintView::factory()->create([
        'blueprint_id' => $blueprint->id,
        'name' => 'My Table View',
        'type' => 'table',
    ]);

    expect($view->blueprint_id)->toBe($blueprint->id)
        ->and($view->name)->toBe('My Table View')
        ->and($view->type)->toBe('table');
});

it('belongs to a blueprint', function () {
    $view = BlueprintView::factory()->create();
    expect($view->blueprint)->toBeInstanceOf(Blueprint::class);
});

it('casts config column as an array', function () {
    $config = ['columns' => ['a', 'b'], 'per_page' => 50];
    $view = BlueprintView::factory()->create(['config' => $config]);

    expect($view->config)->toBe($config);
});

it('exposes the default flag as a boolean', function () {
    $view = BlueprintView::factory()->default()->create();
    expect($view->is_default)->toBeTrue();
});

it('factory states cover the supported view types', function () {
    expect(BlueprintView::factory()->timeline()->make()->type)->toBe('timeline')
        ->and(BlueprintView::factory()->gallery()->make()->type)->toBe('gallery')
        ->and(BlueprintView::factory()->kanban()->make()->type)->toBe('kanban');
});

it('Blueprint::blueprintViews HasMany returns associated views', function () {
    $blueprint = Blueprint::factory()->create();
    BlueprintView::factory()->forBlueprint($blueprint)->count(3)->create();

    expect($blueprint->blueprintViews)->toHaveCount(3);
});

it('defaultTableConfig returns a stable default shape', function () {
    $config = BlueprintView::defaultTableConfig();

    expect($config)->toHaveKeys(['columns', 'sortable_columns', 'sort_field', 'sort_direction', 'per_page'])
        ->and($config['per_page'])->toBe(25);
});

it('cascade-deletes when the blueprint is hard-deleted', function () {
    $blueprint = Blueprint::factory()->create();
    BlueprintView::factory()->forBlueprint($blueprint)->create();

    $blueprint->forceDelete();

    expect(BlueprintView::query()->count())->toBe(0);
});

it('allows multiple non-default views per blueprint', function () {
    $blueprint = Blueprint::factory()->create();
    BlueprintView::factory()->forBlueprint($blueprint)->create(['name' => 'Default Table', 'is_default' => true]);
    BlueprintView::factory()->forBlueprint($blueprint)->timeline()->create();
    BlueprintView::factory()->forBlueprint($blueprint)->gallery()->create();

    expect($blueprint->blueprintViews)->toHaveCount(3);
});
