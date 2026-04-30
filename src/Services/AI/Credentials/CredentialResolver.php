<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Credentials;

use Alexandria\Core\Exceptions\NoApiKeyAvailableException;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Config;

/**
 * Resolves which API credential to use for a given user + provider. Supports
 * three modes:
 *   1. BYOK override: user has an active UserApiKey for the provider.
 *   2. Env fallback (allowed): no user key, alexandria.ai.allow_env_fallback
 *      is true. Reads ai.providers.<sdkKey>.key from app config.
 *   3. Default-deny (SaaS): no user key AND fallback disabled (the default).
 *      Throws NoApiKeyAvailableException so SaaS callers can return a clear
 *      "set up your API key" error to the user, instead of silently billing
 *      the operator's key.
 *
 * Provider slug mapping: Alexandria stores 'google' but the laravel/ai SDK
 * uses 'gemini' as the config key — getSdkProviderKey handles the swap.
 *
 * Replaces legacy App\Services\AI\UserAiContext, which mutated SDK config
 * at runtime. The new pattern returns a typed ResolvedCredential value
 * object that callers pass through to the SDK without touching its config.
 */
class CredentialResolver
{
    /**
     * Alexandria provider slug → laravel/ai SDK config key.
     *
     * @var array<string, string>
     */
    protected const SDK_PROVIDER_MAP = [
        'openai' => 'openai',
        'anthropic' => 'anthropic',
        'google' => 'gemini',
    ];

    /**
     * Resolve a credential for a user + provider.
     *
     * @throws NoApiKeyAvailableException when no user key exists and env
     *                                    fallback is disabled, or when env
     *                                    fallback is enabled but no key is
     *                                    configured for the provider.
     */
    public function resolve(Authenticatable $user, AiProvider $provider): ResolvedCredential
    {
        $sdkProviderKey = $this->getSdkProviderKey($provider->slug);

        // 1. BYOK: try the user's active key first.
        $userKey = $this->findActiveUserKey($user, $provider);
        if ($userKey !== null) {
            return new ResolvedCredential(
                apiKey: $userKey->api_key,
                source: 'user',
                providerSlug: $provider->slug,
                sdkProviderKey: $sdkProviderKey,
            );
        }

        // 2/3. No user key — check the fallback flag.
        if (! $this->envFallbackAllowed()) {
            throw new NoApiKeyAvailableException(
                "No active API key found for user (provider: {$provider->slug}) "
                .'and env fallback is disabled. Set alexandria.ai.allow_env_fallback=true '
                .'to permit operator-supplied keys, or have the user add their own.'
            );
        }

        $envKey = Config::get("ai.providers.{$sdkProviderKey}.key");
        if (! is_string($envKey) || $envKey === '') {
            throw new NoApiKeyAvailableException(
                "Env fallback allowed, but no key configured at ai.providers.{$sdkProviderKey}.key"
            );
        }

        return new ResolvedCredential(
            apiKey: $envKey,
            source: 'env',
            providerSlug: $provider->slug,
            sdkProviderKey: $sdkProviderKey,
        );
    }

    /**
     * Whether env fallback is permitted. Default: false (SaaS-safe).
     */
    public function envFallbackAllowed(): bool
    {
        return Config::get('alexandria.ai.allow_env_fallback', false) === true;
    }

    /**
     * Map an Alexandria provider slug to the laravel/ai SDK config key.
     * Falls through to the slug itself for unmapped values (forward-compat
     * for new providers).
     */
    public function getSdkProviderKey(string $alexandriaSlug): string
    {
        return self::SDK_PROVIDER_MAP[$alexandriaSlug] ?? $alexandriaSlug;
    }

    /**
     * Find the user's active+valid key for a provider, if any.
     */
    protected function findActiveUserKey(Authenticatable $user, AiProvider $provider): ?UserApiKey
    {
        /** @var class-string<UserApiKey> $userApiKeyClass */
        $userApiKeyClass = config('alexandria.models.user_api_key');

        return $userApiKeyClass::query()
            ->where('user_id', $user->getAuthIdentifier())
            ->where('ai_provider_id', $provider->id)
            ->where('is_active', true)
            ->valid()
            ->first();
    }
}
