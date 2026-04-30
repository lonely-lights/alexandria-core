<?php

declare(strict_types=1);

use Alexandria\Core\Exceptions\NoApiKeyAvailableException;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\UserApiKey;
use Alexandria\Core\Services\AI\Credentials\CredentialResolver;
use Alexandria\Core\Services\AI\Credentials\ResolvedCredential;
use Illuminate\Auth\GenericUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

uses(RefreshDatabase::class);

/**
 * Tiny stand-in for a host-app User. CredentialResolver only needs ->id via
 * Authenticatable::getAuthIdentifier(), which GenericUser provides.
 */
function makeCredentialUser(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

// ---------------------------------------------------------------------------
// BYOK happy path
// ---------------------------------------------------------------------------

it('returns a user-source credential when the user has an active+valid key', function () {
    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser(42);

    UserApiKey::factory()
        ->forProvider($provider)
        ->active()
        ->neverExpires()
        ->create([
            'user_id' => $user->getAuthIdentifier(),
            'api_key' => 'sk-byok-user-key',
        ]);

    $credential = (new CredentialResolver)->resolve($user, $provider);

    expect($credential)->toBeInstanceOf(ResolvedCredential::class)
        ->and($credential->source)->toBe('user')
        ->and($credential->apiKey)->toBe('sk-byok-user-key')
        ->and($credential->providerSlug)->toBe('openai')
        ->and($credential->sdkProviderKey)->toBe('openai')
        ->and($credential->isUserKey())->toBeTrue()
        ->and($credential->isEnvKey())->toBeFalse();
});

// ---------------------------------------------------------------------------
// Provider slug mapping (Alexandria 'google' → laravel/ai 'gemini')
// ---------------------------------------------------------------------------

it("maps the Alexandria 'google' slug to the laravel/ai 'gemini' SDK key", function () {
    $provider = AiProvider::factory()->google()->create();
    $user = makeCredentialUser();

    UserApiKey::factory()
        ->forProvider($provider)
        ->active()
        ->neverExpires()
        ->create([
            'user_id' => $user->getAuthIdentifier(),
            'api_key' => 'gemini-user-key',
        ]);

    $credential = (new CredentialResolver)->resolve($user, $provider);

    expect($credential->providerSlug)->toBe('google')
        ->and($credential->sdkProviderKey)->toBe('gemini');
});

it('passes openai and anthropic slugs through unchanged for the SDK key', function () {
    $resolver = new CredentialResolver;

    expect($resolver->getSdkProviderKey('openai'))->toBe('openai')
        ->and($resolver->getSdkProviderKey('anthropic'))->toBe('anthropic');
});

// ---------------------------------------------------------------------------
// Env fallback (allowed)
// ---------------------------------------------------------------------------

it('returns an env-source credential when the user has no key and fallback is allowed', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', 'sk-test-env-key');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    $credential = (new CredentialResolver)->resolve($user, $provider);

    expect($credential->source)->toBe('env')
        ->and($credential->apiKey)->toBe('sk-test-env-key')
        ->and($credential->providerSlug)->toBe('openai')
        ->and($credential->sdkProviderKey)->toBe('openai')
        ->and($credential->isEnvKey())->toBeTrue()
        ->and($credential->isUserKey())->toBeFalse();
});

it('throws when env fallback is allowed but no key is configured for the provider', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', null);

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    (new CredentialResolver)->resolve($user, $provider);
})->throws(NoApiKeyAvailableException::class, 'no key configured at ai.providers.openai.key');

it('throws when env fallback is allowed but the configured key is an empty string', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', '');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    (new CredentialResolver)->resolve($user, $provider);
})->throws(NoApiKeyAvailableException::class, 'no key configured at ai.providers.openai.key');

// ---------------------------------------------------------------------------
// Default-deny SaaS path
// ---------------------------------------------------------------------------

it('throws by default (SaaS-safe) when the user has no key and fallback is disabled', function () {
    Config::set('alexandria.ai.allow_env_fallback', false);

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    (new CredentialResolver)->resolve($user, $provider);
})->throws(
    NoApiKeyAvailableException::class,
    'No active API key found for user (provider: openai) and env fallback is disabled.'
);

it('default-denies even when an env key happens to be configured', function () {
    Config::set('alexandria.ai.allow_env_fallback', false);
    Config::set('ai.providers.openai.key', 'sk-env-should-not-be-used');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    (new CredentialResolver)->resolve($user, $provider);
})->throws(NoApiKeyAvailableException::class, 'env fallback is disabled');

it('default-denies when alexandria.ai.allow_env_fallback is absent from config entirely', function () {
    // Explicit absence guard: a host app that publishes the config but
    // forgets to merge in the new ai section shouldn't accidentally allow
    // env fallback. envFallbackAllowed() reads with default=false.
    Config::offsetUnset('alexandria.ai.allow_env_fallback');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    (new CredentialResolver)->resolve($user, $provider);
})->throws(NoApiKeyAvailableException::class, 'env fallback is disabled');

// ---------------------------------------------------------------------------
// Filtering: inactive / expired / wrong-provider keys are skipped
// ---------------------------------------------------------------------------

it('skips an inactive user key and falls through', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', 'sk-env-fallback');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    UserApiKey::factory()
        ->forProvider($provider)
        ->neverExpires()
        ->create([
            'user_id' => $user->getAuthIdentifier(),
            'api_key' => 'sk-inactive-user-key',
            'is_active' => false,
        ]);

    $credential = (new CredentialResolver)->resolve($user, $provider);

    expect($credential->source)->toBe('env')
        ->and($credential->apiKey)->toBe('sk-env-fallback');
});

it('skips an expired user key and falls through', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', 'sk-env-fallback');

    $provider = AiProvider::factory()->openai()->create();
    $user = makeCredentialUser();

    UserApiKey::factory()
        ->forProvider($provider)
        ->active()
        ->expired()
        ->create([
            'user_id' => $user->getAuthIdentifier(),
            'api_key' => 'sk-expired-user-key',
        ]);

    $credential = (new CredentialResolver)->resolve($user, $provider);

    expect($credential->source)->toBe('env')
        ->and($credential->apiKey)->toBe('sk-env-fallback');
});

it('skips a user key for a different provider and falls through', function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.anthropic.key', 'sk-env-anthropic');

    $providerA = AiProvider::factory()->openai()->create();
    $providerB = AiProvider::factory()->anthropic()->create();
    $user = makeCredentialUser();

    // Active key for OpenAI, but resolver is asked about Anthropic.
    UserApiKey::factory()
        ->forProvider($providerA)
        ->active()
        ->neverExpires()
        ->create([
            'user_id' => $user->getAuthIdentifier(),
            'api_key' => 'sk-openai-only',
        ]);

    $credential = (new CredentialResolver)->resolve($user, $providerB);

    expect($credential->source)->toBe('env')
        ->and($credential->providerSlug)->toBe('anthropic')
        ->and($credential->sdkProviderKey)->toBe('anthropic')
        ->and($credential->apiKey)->toBe('sk-env-anthropic');
});

it("skips another user's key and falls through", function () {
    Config::set('alexandria.ai.allow_env_fallback', true);
    Config::set('ai.providers.openai.key', 'sk-env-fallback');

    $provider = AiProvider::factory()->openai()->create();
    $userA = makeCredentialUser(1);
    $userB = makeCredentialUser(2);

    UserApiKey::factory()
        ->forProvider($provider)
        ->active()
        ->neverExpires()
        ->create([
            'user_id' => $userA->getAuthIdentifier(),
            'api_key' => 'sk-user-a-key',
        ]);

    $credential = (new CredentialResolver)->resolve($userB, $provider);

    expect($credential->source)->toBe('env')
        ->and($credential->apiKey)->toBe('sk-env-fallback');
});

// ---------------------------------------------------------------------------
// envFallbackAllowed() reflects the config flag
// ---------------------------------------------------------------------------

it('envFallbackAllowed() reflects the alexandria.ai.allow_env_fallback config', function () {
    $resolver = new CredentialResolver;

    Config::set('alexandria.ai.allow_env_fallback', false);
    expect($resolver->envFallbackAllowed())->toBeFalse();

    Config::set('alexandria.ai.allow_env_fallback', true);
    expect($resolver->envFallbackAllowed())->toBeTrue();
});

it('envFallbackAllowed() requires strict true (truthy values do not count)', function () {
    $resolver = new CredentialResolver;

    Config::set('alexandria.ai.allow_env_fallback', 1);
    expect($resolver->envFallbackAllowed())->toBeFalse();

    Config::set('alexandria.ai.allow_env_fallback', 'true');
    expect($resolver->envFallbackAllowed())->toBeFalse();
});

// ---------------------------------------------------------------------------
// getSdkProviderKey() standalone behavior
// ---------------------------------------------------------------------------

it('getSdkProviderKey() returns the slug itself for unmapped providers (forward-compat)', function () {
    $resolver = new CredentialResolver;

    expect($resolver->getSdkProviderKey('groq'))->toBe('groq')
        ->and($resolver->getSdkProviderKey('cohere'))->toBe('cohere')
        ->and($resolver->getSdkProviderKey('whatever-new-provider'))->toBe('whatever-new-provider');
});

// ---------------------------------------------------------------------------
// ResolvedCredential helpers
// ---------------------------------------------------------------------------

it('ResolvedCredential::isUserKey() / isEnvKey() reflect the source value', function () {
    $userCredential = new ResolvedCredential(
        apiKey: 'k',
        source: 'user',
        providerSlug: 'openai',
        sdkProviderKey: 'openai',
    );
    $envCredential = new ResolvedCredential(
        apiKey: 'k',
        source: 'env',
        providerSlug: 'google',
        sdkProviderKey: 'gemini',
    );

    expect($userCredential->isUserKey())->toBeTrue()
        ->and($userCredential->isEnvKey())->toBeFalse()
        ->and($envCredential->isEnvKey())->toBeTrue()
        ->and($envCredential->isUserKey())->toBeFalse();
});
