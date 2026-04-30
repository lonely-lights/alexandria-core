<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\AiPrompt;
use Alexandria\Core\Services\AI\AiPromptService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('throws when no active prompt is registered for the key', function () {
    (new AiPromptService)->render('does.not.exist', []);
})->throws(Exception::class, "No active AI prompt found for key 'does.not.exist'");

it('throws when the prompt row exists but the template file is missing', function () {
    AiPrompt::factory()->create([
        'key' => 'missing.file',
        'template_path' => 'nonexistent_path_'.uniqid().'.txt',
    ]);

    (new AiPromptService)->render('missing.file', []);
})->throws(Exception::class, 'Prompt template file not found');

it('substitutes UPPERCASE-bracketed placeholders', function () {
    $tempDir = resource_path('prompts');
    if (! is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    $filename = 'test_'.uniqid().'.txt';
    file_put_contents($tempDir.'/'.$filename, 'Hello [NAME], your note id is [NOTE_ID].');

    AiPrompt::factory()->create([
        'key' => 'test.greet',
        'template_path' => $filename,
    ]);

    $rendered = (new AiPromptService)->render('test.greet', [
        'name' => 'Alice',
        'note_id' => 42,
    ]);

    expect($rendered)->toBe('Hello Alice, your note id is 42.');

    // Cleanup
    @unlink($tempDir.'/'.$filename);
});

it('only renders prompts whose status is active', function () {
    AiPrompt::factory()->inactive()->create([
        'key' => 'inactive.test',
        'template_path' => 'inactive.txt',
    ]);

    (new AiPromptService)->render('inactive.test', []);
})->throws(Exception::class, 'No active AI prompt found');
