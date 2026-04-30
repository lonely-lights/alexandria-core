<?php

declare(strict_types=1);

namespace Alexandria\Core\Tests\Support;

use Alexandria\Core\Services\AI\Prompts\Contexts\AbstractContext;
use Illuminate\Support\Carbon;

/**
 * Concrete subclass that exposes the protected utility helpers so the test
 * suite can exercise them directly without needing a worldbuilding-shaped
 * concrete context. Lives under tests/Support/ so PSR-4 autoload-dev
 * (Alexandria\Core\Tests\) finds it; PHPStorm gets a single concrete type
 * to narrow against instead of an anonymous class declared in the test file.
 */
class AbstractContextDouble extends AbstractContext
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(private array $payload) {}

    public function getType(): string
    {
        return 'AbstractContextDouble';
    }

    public function getVersion(): string
    {
        return '1.0';
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->payload;
    }

    public function exposeSanitize(?string $value): ?string
    {
        return $this->sanitize($value);
    }

    public function exposeTruncate(?string $value, int $maxLength = 1000): ?string
    {
        return $this->truncate($value, $maxLength);
    }

    public function exposeFormatDate(?Carbon $date): ?string
    {
        return $this->formatDate($date);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function replacePayload(array $payload): void
    {
        $this->payload = $payload;
    }
}
