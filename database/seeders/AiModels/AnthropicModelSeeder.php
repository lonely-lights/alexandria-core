<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders\AiModels;

use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Illuminate\Database\Seeder;

/**
 * Anthropic Claude model catalog (Opus, Sonnet, Haiku).
 *
 * Pricing snapshot: 2026-05-05 from https://docs.claude.com/en/docs/about-claude/pricing.
 * Cache pricing follows Anthropic's standard multipliers: 5m write = 1.25x base
 * input, 1h write = 2x base input, cache hit = 0.1x base input. Notes capture
 * the per-model rates for quick reference; the canonical source is the docs.
 */
class AnthropicModelSeeder extends Seeder
{
    public function run(): void
    {
        $provider = AiProvider::where('slug', 'anthropic')->first();
        if (! $provider) {
            return;
        }

        foreach ($this->models() as $model) {
            AiModel::updateOrCreate(
                ['model_id' => $model['model_id']],
                array_merge($model, ['ai_provider_id' => $provider->id])
            );
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function models(): array
    {
        return [
            // Claude 4.7 — current flagship Opus (Apr 2026, new tokenizer)
            [
                'model_id' => 'claude-opus-4-7',
                'display_name' => 'Claude Opus 4.7',
                'category' => 'creative',
                'context_window' => 1000000,
                'input_price_per_million' => 5.00,
                'output_price_per_million' => 25.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_flagship' => true,
                'is_recommended' => true,
                'is_active' => true,
                'notes' => 'Latest Opus. 1M context. New tokenizer (~35% more tokens for same text). Cache 5m write: $6.25/MTok, hit: $0.50/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use', '1m_context'],
                'released_at' => '2026-04-15',
            ],

            // Claude 4.6 series
            [
                'model_id' => 'claude-opus-4-6',
                'display_name' => 'Claude Opus 4.6',
                'category' => 'creative',
                'context_window' => 1000000,
                'input_price_per_million' => 5.00,
                'output_price_per_million' => 25.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_flagship' => true,
                'is_recommended' => true,
                'is_active' => true,
                'notes' => '1M context. Fast mode available (6x premium pricing). Cache 5m write: $6.25/MTok, hit: $0.50/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use', '1m_context', 'fast_mode'],
                'released_at' => '2026-02-10',
            ],
            [
                'model_id' => 'claude-sonnet-4-6',
                'display_name' => 'Claude Sonnet 4.6',
                'category' => 'general',
                'context_window' => 1000000,
                'input_price_per_million' => 3.00,
                'output_price_per_million' => 15.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_flagship' => true,
                'is_recommended' => true,
                'is_active' => true,
                'notes' => '1M context. Cache 5m write: $3.75/MTok, hit: $0.30/MTok. Best balance.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use', '1m_context'],
                'released_at' => '2026-02-10',
            ],

            // Claude 4.5 series
            [
                'model_id' => 'claude-opus-4-5-20251101',
                'display_name' => 'Claude Opus 4.5',
                'category' => 'creative',
                'context_window' => 200000,
                'input_price_per_million' => 5.00,
                'output_price_per_million' => 25.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => true,
                'notes' => 'Cache 5m write: $6.25/MTok, hit: $0.50/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use'],
                'released_at' => '2025-11-01',
            ],
            [
                'model_id' => 'claude-sonnet-4-5-20250929',
                'display_name' => 'Claude Sonnet 4.5',
                'category' => 'general',
                'context_window' => 200000,
                'input_price_per_million' => 3.00,
                'output_price_per_million' => 15.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => true,
                'notes' => '1M context beta. Cache 5m write: $3.75/MTok, hit: $0.30/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use', '1m_context_beta'],
                'released_at' => '2025-09-29',
            ],
            [
                'model_id' => 'claude-haiku-4-5-20251001',
                'display_name' => 'Claude Haiku 4.5',
                'category' => 'fast',
                'context_window' => 200000,
                'input_price_per_million' => 1.00,
                'output_price_per_million' => 5.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_flagship' => true,
                'is_recommended' => true,
                'is_active' => true,
                'notes' => 'Fastest current Claude. Cache 5m write: $1.25/MTok, hit: $0.10/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use'],
                'released_at' => '2025-10-01',
            ],

            // Claude 4.1 / 4.0
            [
                'model_id' => 'claude-opus-4-1-20250805',
                'display_name' => 'Claude Opus 4.1',
                'category' => 'creative',
                'context_window' => 200000,
                'input_price_per_million' => 15.00,
                'output_price_per_million' => 75.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => true,
                'notes' => 'Cache 5m write: $18.75/MTok, hit: $1.50/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use'],
                'released_at' => '2025-08-05',
            ],
            [
                'model_id' => 'claude-opus-4-20250514',
                'display_name' => 'Claude Opus 4',
                'category' => 'creative',
                'context_window' => 200000,
                'input_price_per_million' => 15.00,
                'output_price_per_million' => 75.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => false,
                'notes' => 'DEPRECATED. Cache 5m write: $18.75/MTok, hit: $1.50/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use'],
                'released_at' => '2025-05-14',
            ],
            [
                'model_id' => 'claude-sonnet-4-20250514',
                'display_name' => 'Claude Sonnet 4',
                'category' => 'general',
                'context_window' => 200000,
                'input_price_per_million' => 3.00,
                'output_price_per_million' => 15.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => false,
                'notes' => 'DEPRECATED. 1M context beta. Cache 5m write: $3.75/MTok, hit: $0.30/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use', '1m_context_beta'],
                'released_at' => '2025-05-14',
            ],

            // Legacy 3.x
            [
                'model_id' => 'claude-3-7-sonnet-20250219',
                'display_name' => 'Claude 3.7 Sonnet',
                'category' => 'general',
                'context_window' => 200000,
                'input_price_per_million' => 3.00,
                'output_price_per_million' => 15.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => false,
                'notes' => 'DEPRECATED. Cache 5m write: $3.75/MTok, hit: $0.30/MTok.',
                'capabilities' => ['extended_thinking', 'vision', 'tool_use'],
                'released_at' => '2025-02-24',
            ],
            [
                'model_id' => 'claude-3-5-haiku-20241022',
                'display_name' => 'Claude 3.5 Haiku',
                'category' => 'fast',
                'context_window' => 200000,
                'input_price_per_million' => 0.80,
                'output_price_per_million' => 4.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => true,
                'notes' => 'Cache 5m write: $1.00/MTok, hit: $0.08/MTok.',
                'capabilities' => ['vision', 'tool_use'],
                'released_at' => '2024-10-22',
            ],
            [
                'model_id' => 'claude-3-opus-20240229',
                'display_name' => 'Claude 3 Opus',
                'category' => 'creative',
                'context_window' => 200000,
                'input_price_per_million' => 15.00,
                'output_price_per_million' => 75.00,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => false,
                'notes' => 'DEPRECATED. Cache 5m write: $18.75/MTok, hit: $1.50/MTok.',
                'capabilities' => ['vision', 'tool_use'],
                'released_at' => '2024-02-29',
            ],
            [
                'model_id' => 'claude-3-haiku-20240307',
                'display_name' => 'Claude 3 Haiku',
                'category' => 'fast',
                'context_window' => 200000,
                'input_price_per_million' => 0.25,
                'output_price_per_million' => 1.25,
                'supports_json_mode' => true,
                'supports_vision' => true,
                'is_recommended' => false,
                'is_active' => true,
                'notes' => 'Most affordable Claude. Cache 5m write: $0.30/MTok, hit: $0.03/MTok.',
                'capabilities' => ['vision', 'tool_use'],
                'released_at' => '2024-03-07',
            ],
        ];
    }
}
