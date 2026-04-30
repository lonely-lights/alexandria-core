<?php

declare(strict_types=1);

namespace Alexandria\Core\Exceptions;

use RuntimeException;

/**
 * Thrown by CredentialResolver when a user has no active UserApiKey for their
 * selected provider AND alexandria.ai.allow_env_fallback is disabled.
 *
 * The default-deny flag protects SaaS deployments: a user without their own
 * key shouldn't silently bill the operator's env-configured key. Self-hosted
 * deployments can flip the flag on to allow env fallback.
 *
 * Extends RuntimeException so PHPStorm's PhpUnhandledExceptionInspection
 * treats it as unchecked at call sites.
 */
class NoApiKeyAvailableException extends RuntimeException {}
