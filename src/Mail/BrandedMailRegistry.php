<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

/**
 * In-memory catalog of branded Mailables exposed to the admin email
 * panel. Bound as a singleton via AlexandriaServiceProvider so packages
 * (core, alexandria-app, future alexandria-saas, store-receipts, etc.)
 * can register their own Mailables in their service-provider boot().
 *
 * Slugs are URL-friendly identifiers (verify, reset, store-receipt) —
 * they appear in /admin/emails/{slug} routes. Stay namespaced per
 * package if collision is a risk (e.g. "saas.verify" vs core's "verify").
 */
class BrandedMailRegistry
{
    /** @var array<string, BrandedMailDefinition> */
    private array $mails = [];

    public function register(string $slug, BrandedMailDefinition $definition): void
    {
        $this->mails[$slug] = $definition;
    }

    public function has(string $slug): bool
    {
        return isset($this->mails[$slug]);
    }

    public function get(string $slug): ?BrandedMailDefinition
    {
        return $this->mails[$slug] ?? null;
    }

    /** @return array<string, BrandedMailDefinition> */
    public function all(): array
    {
        return $this->mails;
    }
}
