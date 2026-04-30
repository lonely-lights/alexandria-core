<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

it('logs an activity row when a blueprint is created', function () {
    Blueprint::factory()->create(['name' => 'Character']);

    expect(Activity::query()->count())->toBe(1);

    /** @var Activity $activity */
    $activity = Activity::query()->first();
    expect($activity->log_name)->toBe('project')
        ->and($activity->description)->toBe('created');
});

it('logs only the configured columns when updating', function () {
    $blueprint = Blueprint::factory()->create(['name' => 'Original']);
    Activity::query()->delete();

    $blueprint->update(['name' => 'Renamed', 'metadata' => ['unrelated' => 'change']]);

    /** @var Activity $activity */
    $activity = Activity::query()->latest('id')->first();
    expect($activity)->not->toBeNull()
        ->and($activity->description)->toBe('updated')
        ->and($activity->properties['attributes']['name'] ?? null)->toBe('Renamed')
        ->and($activity->properties['attributes'])->not->toHaveKey('metadata'); // metadata change is filtered out
});

it('skips logging when nothing in the configured columns changed', function () {
    $blueprint = Blueprint::factory()->create();
    Activity::query()->delete();

    // Touch metadata only -- not in logOnly() list -- should NOT log.
    $blueprint->update(['metadata' => ['something' => 'new']]);

    expect(Activity::query()->count())->toBe(0);
});

it('uses the project log name', function () {
    Blueprint::factory()->create();

    /** @var Activity $activity */
    $activity = Activity::query()->first();
    expect($activity->log_name)->toBe('project');
});
