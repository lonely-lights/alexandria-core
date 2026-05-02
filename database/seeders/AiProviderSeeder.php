<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders;

use Alexandria\Core\Models\AiProvider;
use Illuminate\Database\Seeder;

/**
 * Seeds the framework's supported AI provider catalog.
 *
 * Per ADR-004 — this is integration metadata (which providers the
 * framework knows how to talk to), not opinionated content. Lives
 * in core so any consumer of alexandria-core gets the same list.
 *
 * Idempotent — uses updateOrCreate so re-running won't fail.
 */
class AiProviderSeeder extends Seeder
{
    public function run(): void
    {
        AiProvider::updateOrCreate(
            ['slug' => 'openai'],
            ['name' => 'OpenAI', 'website' => 'https://openai.com']
        );
        AiProvider::updateOrCreate(
            ['slug' => 'anthropic'],
            ['name' => 'Anthropic', 'website' => 'https://www.anthropic.com']
        );
        AiProvider::updateOrCreate(
            ['slug' => 'google'],
            ['name' => 'Google AI', 'website' => 'https://ai.google']
        );
        AiProvider::updateOrCreate(
            ['slug' => 'fal'],
            ['name' => 'fal.ai', 'website' => 'https://fal.ai']
        );
    }
}
