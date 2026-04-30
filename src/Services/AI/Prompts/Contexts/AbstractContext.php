<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Contexts;

use Illuminate\Support\Carbon;
use JsonSerializable;

/**
 * Abstract Context
 *
 * Base class for prompt contexts with common functionality.
 * Extend this class to create specific context types.
 */
abstract class AbstractContext implements ContextInterface, JsonSerializable
{
    /**
     * Cache for the toArray() result to avoid recomputation.
     *
     * @var array<string, mixed>|null
     */
    protected ?array $cachedArray = null;

    /**
     * {@inheritdoc}
     */
    abstract public function getType(): string;

    /**
     * {@inheritdoc}
     */
    abstract public function getVersion(): string;

    /**
     * {@inheritdoc}
     */
    abstract public function toArray(): array;

    /**
     * {@inheritdoc}
     */
    public function getDescription(): string
    {
        return 'Context data for AI prompt processing';
    }

    /**
     * Get the cached array representation, computing if needed.
     *
     * @return array<string, mixed>
     */
    public function getCachedArray(): array
    {
        if ($this->cachedArray === null) {
            $this->cachedArray = $this->toArray();
        }

        return $this->cachedArray;
    }

    /**
     * Clear the cached array (useful if underlying data changes).
     */
    public function clearCache(): self
    {
        $this->cachedArray = null;

        return $this;
    }

    /**
     * Convert to JSON string.
     */
    public function toJson(int $options = 0): string
    {
        $defaultOptions = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;

        return json_encode($this->toArray(), $options | $defaultOptions);
    }

    /**
     * Implement JsonSerializable.
     *
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }

    /**
     * Get metadata about this context for debugging/logging.
     *
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
     * Sanitize a string value for safe inclusion in prompts.
     *
     * Removes or escapes characters that could cause issues.
     */
    protected function sanitize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        // Remove null bytes and other control characters (except newlines/tabs)
        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
    }

    /**
     * Truncate a string to a maximum length with ellipsis.
     */
    protected function truncate(?string $value, int $maxLength = 1000): ?string
    {
        if ($value === null || mb_strlen($value) <= $maxLength) {
            return $value;
        }

        return mb_substr($value, 0, $maxLength - 3).'...';
    }

    /**
     * Format a Carbon date for consistent output.
     */
    protected function formatDate(?Carbon $date): ?string
    {
        return $date?->toIso8601String();
    }
}
