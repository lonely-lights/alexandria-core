<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

it('logs an activity row when an entry is created', function () {
    Entry::factory()->create(['name' => 'Aragorn']);

    expect(Activity::query()->count())->toBeGreaterThanOrEqual(1);

    $entryActivity = Activity::query()
        ->where('subject_type', Entry::class)
        ->latest('id')
        ->first();

    expect($entryActivity)->not->toBeNull()
        ->and($entryActivity->log_name)->toBe('project')
        ->and($entryActivity->description)->toBe('created');
});

it('logs only the configured columns when updating an entry', function () {
    $entry = Entry::factory()->create(['name' => 'Original']);
    Activity::query()->delete();

    $entry->update(['name' => 'Renamed', 'metadata' => ['unrelated' => 'change']]);

    $activity = Activity::query()->latest('id')->first();
    expect($activity)->not->toBeNull()
        ->and($activity->description)->toBe('updated')
        ->and($activity->properties['attributes']['name'] ?? null)->toBe('Renamed')
        ->and($activity->properties['attributes'])->not->toHaveKey('metadata');
});

it('skips logging when nothing in the configured columns changed on the entry', function () {
    $entry = Entry::factory()->create();
    Activity::query()->delete();

    $entry->update(['metadata' => ['something' => 'new']]);

    expect(Activity::query()->where('subject_type', Entry::class)->count())->toBe(0);
});
