<?php

declare(strict_types=1);

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('generates section slugs unique per work, not per parent', function () {
    $work = Work::factory()->create();
    $act = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Act 1']);

    $sceneA = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $act->id, 'title' => 'Reunion']);
    $sceneB = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Reunion']);

    expect($sceneA->slug)->toBe('reunion')
        ->and($sceneB->slug)->toBe('reunion-2');
});

it('auto-assigns position as max+1 within the sibling group', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);

    $first = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);
    $second = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);
    $rootLevel = WorkSection::factory()->create(['work_id' => $work->id]);

    expect($first->position)->toBe(0)
        ->and($second->position)->toBe(1)
        ->and($rootLevel->position)->toBe(1); // parent itself occupies root position 0
});

it('inherits the work format unless overridden', function () {
    $work = Work::factory()->create(['format' => 'screenplay']);
    $inherits = WorkSection::factory()->create(['work_id' => $work->id]);
    $overrides = WorkSection::factory()->create(['work_id' => $work->id, 'format' => 'prose']);

    expect($inherits->effectiveFormat())->toBe('screenplay')
        ->and($overrides->effectiveFormat())->toBe('prose');
});

it('orders children by position', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);
    $b = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'title' => 'B']);
    $a = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'title' => 'A']);

    $a->update(['position' => 0]);
    $b->update(['position' => 1]);

    expect($parent->fresh()->children->pluck('title')->all())->toBe(['A', 'B']);
});
