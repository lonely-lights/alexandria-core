<?php

declare(strict_types=1);

namespace Alexandria\Core\DTO;

/**
 * AI Response Data Transfer Object
 *
 * Holds structured response data from AI services including content,
 * token usage, costs, and efficiency metrics for user visibility.
 */
readonly class AiResponseDTO
{
    public function __construct(
        /**
         * The main text content returned by the AI.
         */
        public string $content,

        /**
         * The total number of tokens used for the entire transaction (prompt + completion).
         */
        public int $totalTokens,

        /**
         * The calculated cost of the transaction in USD.
         */
        public float $cost,

        /**
         * The name of the model that was used.
         */
        public string $modelName,

        /**
         * Number of input/prompt tokens.
         */
        public int $inputTokens = 0,

        /**
         * Number of output/completion tokens.
         */
        public int $outputTokens = 0,

        /**
         * Number of thinking/reasoning tokens (Gemini 2.5 models).
         * These are internal reasoning tokens used by the model.
         */
        public int $thinkingTokens = 0,

        /**
         * Number of tokens read from cache (Anthropic).
         * When using prompt caching, these tokens cost significantly less.
         */
        public int $cacheReadTokens = 0,

        /**
         * Number of tokens written to cache (Anthropic).
         * First request pays full price + small cache write fee, subsequent requests benefit.
         */
        public int $cacheWriteTokens = 0,

        /**
         * Estimated cost savings from caching (USD).
         * Calculated as: (cacheReadTokens * normalInputPrice) - (cacheReadTokens * cachedInputPrice)
         */
        public float $cacheSavings = 0.0,

        /**
         * Provider-specific metadata for transparency.
         * May include: finish_reason, safety_ratings, latency_ms, etc.
         */
        public array $metadata = [],
    ) {}

    /**
     * Get efficiency summary for user display.
     *
     * @return array{
     *     total_tokens: int,
     *     input_tokens: int,
     *     output_tokens: int,
     *     cache_read_tokens: int,
     *     cache_write_tokens: int,
     *     cost_usd: string,
     *     savings_usd: string,
     *     cache_hit_rate: string,
     *     efficiency_rating: string
     * }
     */
    public function getEfficiencySummary(): array
    {
        $cacheHitRate = $this->inputTokens > 0
            ? round(($this->cacheReadTokens / $this->inputTokens) * 100, 1)
            : 0;

        // Determine efficiency rating based on cache utilization
        $efficiencyRating = match (true) {
            $cacheHitRate >= 80 => 'excellent',
            $cacheHitRate >= 50 => 'good',
            $cacheHitRate >= 20 => 'moderate',
            $this->cacheReadTokens > 0 => 'low',
            default => 'none', // No caching used
        };

        return [
            'total_tokens' => $this->totalTokens,
            'input_tokens' => $this->inputTokens,
            'output_tokens' => $this->outputTokens,
            'cache_read_tokens' => $this->cacheReadTokens,
            'cache_write_tokens' => $this->cacheWriteTokens,
            'cost_usd' => '$'.number_format($this->cost, 4),
            'savings_usd' => '$'.number_format($this->cacheSavings, 4),
            'cache_hit_rate' => $cacheHitRate.'%',
            'efficiency_rating' => $efficiencyRating,
        ];
    }

    /**
     * Check if this response used any caching.
     */
    public function usedCaching(): bool
    {
        return $this->cacheReadTokens > 0 || $this->cacheWriteTokens > 0;
    }

    /**
     * Get a human-readable cost breakdown.
     */
    public function getCostBreakdown(): string
    {
        $parts = [];
        $parts[] = "Total: \${$this->formatCost($this->cost)}";

        if ($this->cacheSavings > 0) {
            $parts[] = "Saved: \${$this->formatCost($this->cacheSavings)}";
            $wouldHaveCost = $this->cost + $this->cacheSavings;
            $parts[] = "(would have been \${$this->formatCost($wouldHaveCost)} without caching)";
        }

        return implode(' | ', $parts);
    }

    /**
     * Format cost for display.
     */
    private function formatCost(float $cost): string
    {
        return number_format($cost, 4);
    }
}
