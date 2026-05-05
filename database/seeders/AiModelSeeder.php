<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders;

use Alexandria\Core\Database\Seeders\AiModels\AnthropicModelSeeder;
use Alexandria\Core\Database\Seeders\AiModels\FalModelSeeder;
use Alexandria\Core\Database\Seeders\AiModels\GoogleModelSeeder;
use Alexandria\Core\Database\Seeders\AiModels\OpenAiModelSeeder;
use Illuminate\Database\Seeder;

/**
 * AI model catalog — thin orchestrator that dispatches to per-provider seeders.
 *
 * Each provider's catalog lives in `database/seeders/AiModels/<Provider>ModelSeeder.php`
 * so model lists stay readable + reviewable per-provider rather than buried in
 * a single 1500+ line file. Adding a new provider = one new seeder file + one
 * `$this->call()` here.
 *
 * Pricing snapshot is point-in-time (currently 2026-05-05). Future direction:
 * pull from provider APIs where the data is available — Google, OpenAI, and
 * Anthropic publish model metadata via their SDKs but pricing is generally not
 * part of the model surface, so seed-as-snapshot remains the simplest contract.
 * Refresh on each significant release.
 */
class AiModelSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            GoogleModelSeeder::class,
            OpenAiModelSeeder::class,
            AnthropicModelSeeder::class,
            FalModelSeeder::class,
        ]);
    }
}
