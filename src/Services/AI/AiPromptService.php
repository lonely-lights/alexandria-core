<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Models\System\AiPrompt;
use Exception;
use Illuminate\Support\Facades\File;

/**
 * Looks up an active prompt by key and renders it with substituted
 * placeholders. Each placeholder in the template file matches an
 * uppercase-bracketed key (e.g. [NOTE_ID]); the matching value comes
 * from the data array passed to render().
 */
class AiPromptService
{
    /**
     * Render the active prompt for a key, with values substituted into
     * UPPERCASE-bracketed placeholders.
     *
     * @param  array<string, scalar>  $data  Key-value pairs to inject. Each key
     *                                       becomes [KEY] in the template.
     *
     * @throws Exception When no active prompt exists for the key, or
     *                   when the template file is missing on disk.
     */
    public function render(string $key, array $data): string
    {
        $prompt = AiPrompt::query()->where('key', $key)->active()->first();

        if (! $prompt) {
            throw new Exception("No active AI prompt found for key '$key'.");
        }

        $fullPath = resource_path('prompts/'.$prompt->template_path);

        if (! File::exists($fullPath)) {
            throw new Exception("Prompt template file not found at: $fullPath");
        }

        $templateContent = File::get($fullPath);

        $placeholders = [];
        $values = [];

        foreach ($data as $placeholderKey => $value) {
            // e.g. 'note_id' becomes '[NOTE_ID]'
            $placeholders[] = '['.strtoupper((string) $placeholderKey).']';
            $values[] = (string) $value;
        }

        return str_replace($placeholders, $values, $templateContent);
    }
}
