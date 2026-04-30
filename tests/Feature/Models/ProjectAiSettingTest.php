<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectAiSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates with sensible defaults', function () {
    $project = Project::factory()->create();
    $setting = ProjectAiSetting::factory()->create(['project_id' => $project->id]);

    expect($setting->ai_enabled)->toBeTrue()
        ->and($setting->auto_categorize)->toBeFalse()
        ->and($setting->require_approval)->toBeTrue()
        ->and($setting->default_routing_action)->toBe('suggest');
});

it('belongs to a project', function () {
    $setting = ProjectAiSetting::factory()->create();
    expect($setting->project)->toBeInstanceOf(Project::class);
});

it('isAiAvailable reflects the master toggle', function () {
    $on = ProjectAiSetting::factory()->create(['ai_enabled' => true]);
    $off = ProjectAiSetting::factory()->disabled()->create();

    expect($on->isAiAvailable())->toBeTrue()
        ->and($off->isAiAvailable())->toBeFalse();
});

it('isFeatureEnabled returns true for all features when enabled_features is null and ai is enabled', function () {
    $setting = ProjectAiSetting::factory()->create(['enabled_features' => null]);
    expect($setting->isFeatureEnabled('any_feature'))->toBeTrue();
});

it('isFeatureEnabled returns false when ai is disabled regardless of enabled_features', function () {
    $setting = ProjectAiSetting::factory()->disabled()->create([
        'enabled_features' => ['routing'],
    ]);
    expect($setting->isFeatureEnabled('routing'))->toBeFalse();
});

it('isFeatureEnabled checks the enabled_features list when set', function () {
    $setting = ProjectAiSetting::factory()->create([
        'enabled_features' => ['routing', 'autotag'],
    ]);
    expect($setting->isFeatureEnabled('routing'))->toBeTrue()
        ->and($setting->isFeatureEnabled('summarization'))->toBeFalse();
});

it('Project::aiSettings HasOne returns the setting row', function () {
    $project = Project::factory()->create();
    ProjectAiSetting::factory()->create(['project_id' => $project->id]);

    expect($project->aiSettings)->toBeInstanceOf(ProjectAiSetting::class);
});

it('cascade-deletes when project is hard-deleted', function () {
    $project = Project::factory()->create();
    ProjectAiSetting::factory()->create(['project_id' => $project->id]);

    $project->forceDelete();

    expect(ProjectAiSetting::query()->count())->toBe(0);
});
