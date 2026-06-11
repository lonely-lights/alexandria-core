<?php

declare(strict_types=1);

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Services\Writing\SectionTreeService;
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

it('moves a section under a new parent at a position, resequencing both sibling groups', function () {
    $work = Work::factory()->create();
    $partOne = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Part One']);
    $partTwo = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'Part Two']);
    $chapter = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $partOne->id, 'title' => 'Chapter']);
    $existing = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $partTwo->id, 'title' => 'Existing']);

    app(SectionTreeService::class)->move($chapter, $partTwo->id, 0);

    expect($chapter->fresh()->parent_id)->toBe($partTwo->id)
        ->and($chapter->fresh()->position)->toBe(0)
        ->and($existing->fresh()->position)->toBe(1)
        ->and($chapter->fresh()->slug)->toBe('chapter'); // slug untouched by moves
});

it('refuses to move a section under its own descendant', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id]);
    $child = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);

    app(SectionTreeService::class)->move($parent, $child->id, 0);
})->throws(InvalidArgumentException::class);

it('refuses to move a section under a parent from another work', function () {
    $section = WorkSection::factory()->create();
    $foreign = WorkSection::factory()->create();

    app(SectionTreeService::class)->move($section, $foreign->id, 0);
})->throws(InvalidArgumentException::class);

it('reorders a sibling group to the given id sequence', function () {
    $work = Work::factory()->create();
    $a = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'A']);
    $b = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'B']);
    $c = WorkSection::factory()->create(['work_id' => $work->id, 'title' => 'C']);

    app(SectionTreeService::class)->reorder($work, null, [$c->id, $a->id, $b->id]);

    expect($work->fresh()->rootSections->pluck('title')->all())->toBe(['C', 'A', 'B']);
});

it('treats a section with a soft-deleted ancestor as safe to move', function () {
    $work = Work::factory()->create();
    $grandparent = WorkSection::factory()->create(['work_id' => $work->id]);
    $parent = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $grandparent->id]);
    $child = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id]);
    $target = WorkSection::factory()->create(['work_id' => $work->id]);

    $parent->delete(); // soft-delete mid-chain

    app(SectionTreeService::class)->move($target, $child->id, 0);

    expect($target->fresh()->parent_id)->toBe($child->id);
});

it('soft-deletes a section together with its descendants and refreshes the rollup', function () {
    $work = Work::factory()->create();
    $parent = WorkSection::factory()->create(['work_id' => $work->id, 'word_count' => 5]);
    $child = WorkSection::factory()->create(['work_id' => $work->id, 'parent_id' => $parent->id, 'word_count' => 7]);
    $sibling = WorkSection::factory()->create(['work_id' => $work->id, 'word_count' => 3]);
    $work->update(['word_count' => 15]);

    app(SectionTreeService::class)->deleteSubtree($parent);

    expect(WorkSection::query()->find($parent->id))->toBeNull()
        ->and(WorkSection::query()->find($child->id))->toBeNull()
        ->and(WorkSection::withTrashed()->find($child->id))->not->toBeNull()
        ->and($sibling->fresh())->not->toBeNull()
        ->and($work->fresh()->word_count)->toBe(3);
});

it('exposes works on the project for scoped route binding', function () {
    $work = Work::factory()->create();

    expect($work->project->works->pluck('id')->all())->toBe([$work->id]);
});
