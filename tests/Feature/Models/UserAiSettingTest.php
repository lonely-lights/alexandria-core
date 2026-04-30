<?php

declare(strict_types=1);

use Alexandria\Core\Models\UserAiSetting;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates with sensible defaults', function () {
    $setting = UserAiSetting::factory()->create();
    expect($setting->user_id)->toBeInt()
        ->and($setting->ai_provider_id)->toBeInt();
});

it('hasValidKey returns false when no active or legacy key exists', function () {
    $setting = UserAiSetting::factory()->create();
    expect($setting->hasValidKey())->toBeFalse();
});

it('hasValidKey returns true when an active UserApiKey is present and valid', function () {
    $setting = UserAiSetting::factory()->create();
    $key = UserApiKey::factory()->active()->create([
        'user_id' => $setting->user_id,
        'ai_provider_id' => $setting->ai_provider_id,
    ]);
    $setting->update(['active_api_key_id' => $key->id]);

    expect($setting->fresh()->hasValidKey())->toBeTrue();
});

it('isLegacyKeyExpired returns false when api_key_expires_at is null', function () {
    $setting = UserAiSetting::factory()->create(['api_key_expires_at' => null]);
    expect($setting->isLegacyKeyExpired())->toBeFalse();
});

it('isLegacyKeyExpired returns true when api_key_expires_at is in the past', function () {
    $setting = UserAiSetting::factory()->create(['api_key_expires_at' => now()->subDay()]);
    expect($setting->isLegacyKeyExpired())->toBeTrue();
});

it('clearLegacyApiKey nulls all four legacy fields', function () {
    $setting = UserAiSetting::factory()->create([
        'api_key' => 'legacy',
        'api_key_last_four' => '1234',
        'api_key_expires_at' => now()->addYear(),
        'api_key_created_at' => now(),
    ]);

    // The method is @deprecated -- this test deliberately exercises it
    // to lock the legacy-clear behavior in place until the legacy fields
    // can be dropped from the schema.
    /** @noinspection PhpDeprecationInspection */
    $setting->clearLegacyApiKey();

    /** @var UserAiSetting $fresh */
    $fresh = $setting->fresh();
    expect($fresh->api_key)->toBeNull()
        ->and($fresh->api_key_last_four)->toBeNull()
        ->and($fresh->api_key_expires_at)->toBeNull()
        ->and($fresh->api_key_created_at)->toBeNull();
});
