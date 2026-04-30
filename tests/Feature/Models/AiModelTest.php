<?php

declare(strict_types=1);

use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a model belonging to a provider', function () {
    $model = AiModel::factory()->create();
    expect($model->provider)->toBeInstanceOf(AiProvider::class);
});

it('casts decimal prices, booleans, dates, and JSON capabilities', function () {
    $model = AiModel::factory()->create([
        'input_price_per_million' => 3.5,
        'is_recommended' => true,
        'released_at' => '2025-01-15',
        'capabilities' => ['streaming' => true, 'tools' => false],
    ]);

    expect((float) $model->input_price_per_million)->toBe(3.5)
        ->and($model->is_recommended)->toBeTrue()
        ->and($model->released_at->format('Y-m-d'))->toBe('2025-01-15')
        ->and($model->capabilities)->toBe(['streaming' => true, 'tools' => false]);
});

it('formats input/output prices as currency strings', function () {
    $model = AiModel::factory()->create([
        'input_price_per_million' => 3.5,
        'output_price_per_million' => 15.0,
    ]);

    expect($model->formatted_input_price)->toBe('$3.50/1M')
        ->and($model->formatted_output_price)->toBe('$15.00/1M');
});

it('returns N/A when price is null', function () {
    $model = AiModel::factory()->create([
        'input_price_per_million' => null,
        'output_price_per_million' => null,
    ]);

    expect($model->formatted_input_price)->toBe('N/A')
        ->and($model->formatted_output_price)->toBe('N/A');
});

it('active scope filters by is_active', function () {
    AiModel::factory()->count(2)->create();
    AiModel::factory()->inactive()->create();

    expect(AiModel::active()->count())->toBe(2);
});

it('category scope filters by category', function () {
    AiModel::factory()->analyst()->create();
    AiModel::factory()->creative()->create();
    AiModel::factory()->create(['category' => 'general']);

    expect(AiModel::category('analyst')->count())->toBe(1)
        ->and(AiModel::category('creative')->count())->toBe(1)
        ->and(AiModel::category('general')->count())->toBe(1);
});

it('recommendedFirst scope sorts recommended before non-recommended, then by release date desc', function () {
    AiModel::factory()->create(['display_name' => 'Old Reg', 'released_at' => '2024-01-01', 'is_recommended' => false]);
    AiModel::factory()->create(['display_name' => 'New Reg', 'released_at' => '2025-01-01', 'is_recommended' => false]);
    AiModel::factory()->create(['display_name' => 'Old Rec', 'released_at' => '2024-01-01', 'is_recommended' => true]);

    $names = AiModel::recommendedFirst()->pluck('display_name')->all();
    expect($names[0])->toBe('Old Rec'); // recommended trumps recency
    expect($names[1])->toBe('New Reg'); // then newest
});

it('cascade-deletes models when provider is hard-deleted', function () {
    $provider = AiProvider::factory()->create();
    AiModel::factory()->forProvider($provider)->count(3)->create();

    $provider->forceDelete();

    expect(AiModel::query()->count())->toBe(0);
});
