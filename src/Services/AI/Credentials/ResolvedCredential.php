<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Credentials;

/**
 * The output of CredentialResolver: a single resolved credential ready for
 * use by an AI SDK call. The 'source' field gets logged onto the
 * AiTransaction row for BYOK billing attribution.
 *
 * - $providerSlug uses Alexandria's slug ('openai', 'anthropic', 'google')
 * - $sdkProviderKey uses the laravel/ai SDK's config key ('openai',
 *   'anthropic', 'gemini') — see CredentialResolver::SDK_PROVIDER_MAP.
 */
final readonly class ResolvedCredential
{
    public function __construct(
        public string $apiKey,
        public string $source,
        public string $providerSlug,
        public string $sdkProviderKey,
    ) {}

    public function isUserKey(): bool
    {
        return $this->source === 'user';
    }

    public function isEnvKey(): bool
    {
        return $this->source === 'env';
    }
}
