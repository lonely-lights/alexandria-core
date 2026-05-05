<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Contexts;

use Illuminate\Support\Carbon;
use JsonSerializable;

/**
 * Base class for prompt contexts — provides toArray caching, JSON serialization, and string-sanitization helpers.
 */
abstract class AbstractContext implements ContextInterface, JsonSerializable
{
    /**
     * @var array<string, mixed>|null
     */
    protected ?array $cachedArray = null;

    abstract public function getType(): string;

    abstract public function getVersion(): string;

    abstract public function toArray(): array;

    public function getDescription(): string
    {
        return 'Context data for AI prompt processing';
    }

    /**
     * @return array<string, mixed>
     */
    public function getCachedArray(): array
    {
        if ($this->cachedArray === null) {
            $this->cachedArray = $this->toArray();
        }

        return $this->cachedArray;
    }

    public function clearCache(): self
    {
        $this->cachedArray = null;

        return $this;
    }

    public function toJson(int $options = 0): string
    {
        $defaultOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;

        return json_encode($this->toArray(), $options | $defaultOptions);
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function getMetadata(): array
    {
        return [
            'type' => $this->getType(),
            'version' => $this->getVersion(),
            'description' => $this->getDescription(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Strip control characters (except newline/tab) from a prompt-bound string.
     */
    protected function sanitize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
    }

    protected function truncate(?string $value, int $maxLength = 1000): ?string
    {
        if ($value === null || mb_strlen($value) <= $maxLength) {
            return $value;
        }

        return mb_substr($value, 0, $maxLength - 3).'...';
    }

    protected function formatDate(?Carbon $date): ?string
    {
        return $date?->toIso8601String();
    }
}
