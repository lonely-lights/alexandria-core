<?php

declare(strict_types=1);

/**
 * @noinspection PhpUndefinedFieldInspection
 */

use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates with encrypted api_key', function () {
    $key = UserApiKey::factory()->create(['api_key' => 'sk-test-secret']);
    expect($key->api_key)->toBe('sk-test-secret');
});

it('is_expired returns false when expires_at is null', function () {
    $key = UserApiKey::factory()->neverExpires()->create();
    expect($key->is_expired)->toBeFalse()
        ->and($key->isValid())->toBeTrue();
});

it('is_expired returns true when expires_at is in the past', function () {
    $key = UserApiKey::factory()->expired()->create();
    expect($key->is_expired)->toBeTrue()
        ->and($key->isValid())->toBeFalse();
});

it('expiration_status formats correctly across ranges', function () {
    $never = UserApiKey::factory()->neverExpires()->create();
    $expired = UserApiKey::factory()->expired()->create();
    $tomorrow = UserApiKey::factory()->expiresIn(1)->create();
    $sixDays = UserApiKey::factory()->expiresIn(6)->create();
    $faraway = UserApiKey::factory()->expiresIn(60)->create();

    expect($never->expiration_status)->toBe('Never expires')
        ->and($expired->expiration_status)->toBe('Expired')
        ->and($tomorrow->expiration_status)->toBe('Expires tomorrow')
        ->and($sixDays->expiration_status)->toContain('days')
        ->and($faraway->expiration_status)->toContain('Expires');
});

it('last_used_status returns Never used when last_used_at is null', function () {
    $key = UserApiKey::factory()->create(['last_used_at' => null]);
    expect($key->last_used_status)->toBe('Never used');
});

it('markAsUsed sets last_used_at', function () {
    $key = UserApiKey::factory()->create(['last_used_at' => null]);
    $key->markAsUsed();
    expect($key->fresh()->last_used_at)->not->toBeNull();
});

it('activate deactivates other keys for the same user+provider and activates this one', function () {
    $userId = 42;
    $provider = AiProvider::factory()->create();
    $first = UserApiKey::factory()->active()->create(['user_id' => $userId, 'ai_provider_id' => $provider->id]);
    $second = UserApiKey::factory()->forProvider($provider)->create(['user_id' => $userId, 'is_active' => false]);

    $second->activate();

    expect($first->fresh()->is_active)->toBeFalse()
        ->and($second->fresh()->is_active)->toBeTrue();
});

it('valid scope filters out keys whose expires_at is in the past', function () {
    UserApiKey::factory()->expiresIn(7)->create();
    UserApiKey::factory()->neverExpires()->create();
    UserApiKey::factory()->expired()->create();

    expect(UserApiKey::valid()->count())->toBe(2);
});

it('forProvider scope filters by provider id', function () {
    $a = AiProvider::factory()->create();
    $b = AiProvider::factory()->create();
    UserApiKey::factory()->forProvider($a)->count(2)->create();
    UserApiKey::factory()->forProvider($b)->create();

    expect(UserApiKey::forProvider($a->id)->count())->toBe(2);
});

it('generateSuggestedLabel formats correctly', function () {
    $provider = AiProvider::factory()->openai()->create();
    $label = UserApiKey::generateSuggestedLabel($provider, 'Personal');

    expect($label)->toContain('Personal', 'OpenAI');
});
