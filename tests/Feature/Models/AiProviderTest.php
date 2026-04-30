<?php

declare(strict_types=1);

use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a provider with a unique slug', function () {
    $provider = AiProvider::factory()->anthropic()->create();
    expect($provider->slug)->toBe('anthropic');
});

it('hasMany models', function () {
    $provider = AiProvider::factory()->create();
    AiModel::factory()->forProvider($provider)->count(3)->create();

    expect($provider->models)->toHaveCount(3);
});

it('activeModels filters out inactive', function () {
    $provider = AiProvider::factory()->create();
    AiModel::factory()->forProvider($provider)->count(2)->create();
    AiModel::factory()->forProvider($provider)->inactive()->create();

    expect($provider->activeModels)->toHaveCount(2);
});

it('analystModels returns analyst + general models, recommended first', function () {
    $provider = AiProvider::factory()->create();
    AiModel::factory()->forProvider($provider)->analyst()->create(['display_name' => 'Analyst A']);
    AiModel::factory()->forProvider($provider)->analyst()->recommended()->create(['display_name' => 'Analyst Rec']);
    AiModel::factory()->forProvider($provider)->creative()->create(['display_name' => 'Creative']);
    AiModel::factory()->forProvider($provider)->create(['display_name' => 'General', 'category' => 'general']);

    $models = $provider->analystModels()->get();

    expect($models->pluck('display_name')->all())
        ->toContain('Analyst A', 'Analyst Rec', 'General')
        ->and($models->pluck('display_name')->all())->not->toContain('Creative')
        ->and($models->first()->display_name)->toBe('Analyst Rec'); // recommended first
});

it('creativeModels returns creative + general models', function () {
    $provider = AiProvider::factory()->create();
    AiModel::factory()->forProvider($provider)->creative()->create();
    AiModel::factory()->forProvider($provider)->analyst()->create();
    AiModel::factory()->forProvider($provider)->create(['category' => 'general']);

    expect($provider->creativeModels()->get())->toHaveCount(2); // creative + general
});
