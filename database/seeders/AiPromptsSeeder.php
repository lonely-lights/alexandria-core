<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Seeders;

use Alexandria\Core\Models\System\AiPrompt;
use Illuminate\Database\Seeder;

class AiPromptsSeeder extends Seeder
{
    public function run(): void
    {
        AiPrompt::updateOrCreate(
            [
                'key' => 'notes.sort',
                'version' => 1,
            ],
            [
                'name' => 'Note Sorting Curator V1',
                'template_path' => 'notes/sort_curator_v1.txt',
                'status' => 'active', // Set to active so the service can find it
                'notes' => 'Initial version of the prompt for categorizing user notes.',
            ]
        );

        AiPrompt::updateOrCreate(
            [
                'key' => 'notes.sort_v2',
                'version' => 1,
            ],
            [
                'name' => 'Note Sorting Curator V2 (Two-Phase)',
                'template_path' => 'notes/sort_curator_v2.txt',
                'status' => 'active',
                'notes' => 'Two-phase prompt that uses a world index first, then requests details to save tokens.',
            ]
        );

        AiPrompt::updateOrCreate(
            [
                'key' => 'notes.eav_sort_v1',
                'version' => 1,
            ],
            [
                'name' => 'EAV Note Sorting V1',
                'template_path' => 'notes/eav_sort_v1.txt',
                'status' => 'active',
                'notes' => 'EAV-specific prompt for categorizing notes within Entry-Attribute-Value projects.',
            ]
        );

        AiPrompt::updateOrCreate(
            [
                'key' => 'notes.entrytype_classification_v1',
                'version' => 1,
            ],
            [
                'name' => 'Blueprint Classification V1',
                'template_path' => 'notes/blueprint_classification_v1.txt',
                'status' => 'active',
                'notes' => 'Stage 1: Classify notes to Blueprint(s) for two-stage processing.',
            ]
        );
    }
}
