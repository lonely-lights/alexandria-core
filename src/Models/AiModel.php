<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\AiModelFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $ai_provider_id
 * @property string $model_id
 * @property string $display_name
 * @property string $category
 * @property int|null $context_window
 * @property float|null $input_price_per_million
 * @property float|null $output_price_per_million
 * @property bool $supports_json_mode
 * @property bool $supports_vision
 * @property bool $is_flagship
 * @property bool $is_recommended
 * @property bool $is_active
 * @property Carbon|null $released_at
 * @property string|null $notes
 * @property array<string, mixed>|null $capabilities
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read AiProvider $provider
 * @property-read string $formatted_input_price
 * @property-read string $formatted_output_price
 *
 * @method static Builder<static> active()
 * @method static Builder<static> category(string $category)
 * @method static Builder<static> recommendedFirst()
 * @method static AiModelFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static AiModel create(array $attributes = [])
 */
class AiModel extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): AiModelFactory
    {
        return AiModelFactory::new();
    }

    protected function casts(): array
    {
        return [
            'context_window' => 'integer',
            'input_price_per_million' => 'decimal:4',
            'output_price_per_million' => 'decimal:4',
            'supports_json_mode' => 'boolean',
            'supports_vision' => 'boolean',
            'is_flagship' => 'boolean',
            'is_recommended' => 'boolean',
            'is_active' => 'boolean',
            'released_at' => 'date',
            'capabilities' => 'array',
        ];
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Recommended-first, then newest by release date. Models with null
     * released_at sort last within their group.
     */
    public function scopeRecommendedFirst(Builder $query): Builder
    {
        return $query->orderByDesc('is_recommended')
            ->orderByRaw('released_at IS NULL')
            ->orderByDesc('released_at');
    }

    protected function formattedInputPrice(): Attribute
    {
        return Attribute::get(fn () => $this->input_price_per_million === null
            ? 'N/A'
            : '$'.number_format((float) $this->input_price_per_million, 2).'/1M');
    }

    protected function formattedOutputPrice(): Attribute
    {
        return Attribute::get(fn () => $this->output_price_per_million === null
            ? 'N/A'
            : '$'.number_format((float) $this->output_price_per_million, 2).'/1M');
    }

    /**
     * Calculate estimated cost including Anthropic prompt cache pricing.
     *
     * Anthropic cache pricing: writes at 1.25x, reads at 0.1x input price.
     * The SDK reports all cached tokens as cache_write (even reads), so we
     * apply read pricing (0.1x) when cache_read is 0 but cache_write > 0
     * with low input tokens — indicating a cache hit misreported as a write.
     */
    public function calculateCost(int $inputTokens, int $outputTokens, int $cacheWriteTokens = 0, int $cacheReadTokens = 0): float
    {
        $inputPrice = (float) ($this->input_price_per_million ?? 0);

        $inputCost = ($inputTokens / 1_000_000) * $inputPrice;
        $outputCost = ($outputTokens / 1_000_000) * (float) ($this->output_price_per_million ?? 0);

        // When cache_read is reported correctly, use exact pricing.
        // When only cache_write is reported (SDK limitation on some providers),
        // we apply read pricing IF the cacheWrite count vastly exceeds the
        // input tokens — that ratio proves the cache was actually hit (you
        // can't write more cache tokens than the prompt actually contained).
        // Genuine first writes on small prompts (e.g. 50 input + 30 cache_write)
        // stay at write pricing.
        $cacheReadCost = ($cacheReadTokens / 1_000_000) * ($inputPrice * 0.1);
        $likelyMisreportedRead = $cacheReadTokens === 0
            && $cacheWriteTokens > 0
            && $inputTokens < ($cacheWriteTokens * 0.1);
        $cacheWriteCost = ($cacheWriteTokens / 1_000_000) * (
            $likelyMisreportedRead
                ? $inputPrice * 0.1   // Likely a cache read misreported as write
                : $inputPrice * 1.25  // Genuine first write
        );

        return $inputCost + $outputCost + $cacheWriteCost + $cacheReadCost;
    }
}
