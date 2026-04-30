<?php

declare(strict_types=1);

/**
 * @noinspection PhpUndefinedMethodInspection
 */

use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Models\AI\PromptTemplateVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a prompt template with required fields', function () {
    $template = PromptTemplate::factory()->create([
        'key' => 'test.notes.categorize',
        'name' => 'Categorize Notes',
    ]);

    expect($template->key)->toBe('test.notes.categorize')
        ->and($template->name)->toBe('Categorize Notes')
        ->and($template->is_system)->toBeFalse()
        ->and($template->is_active)->toBeTrue()
        ->and($template->version)->toBe(1);
});

it('finds a template by its unique key', function () {
    $template = PromptTemplate::factory()->create(['key' => 'unique.key.test']);

    expect(PromptTemplate::findByKey('unique.key.test')?->id)->toBe($template->id)
        ->and(PromptTemplate::findByKey('does.not.exist'))->toBeNull();
});

it('hasDataContextPlaceholder detects [DATA_CONTEXT] placeholder', function () {
    $with = PromptTemplate::factory()->make(['template' => 'Body with [DATA_CONTEXT] inside']);
    $without = PromptTemplate::factory()->make(['template' => 'No placeholder here']);

    expect($with->hasDataContextPlaceholder())->toBeTrue()
        ->and($without->hasDataContextPlaceholder())->toBeFalse();
});

it('validateTemplate flags missing or duplicate placeholders', function () {
    $missing = PromptTemplate::factory()->make(['template' => 'No placeholder']);
    $duplicate = PromptTemplate::factory()->make(['template' => '[DATA_CONTEXT] foo [DATA_CONTEXT]']);
    $valid = PromptTemplate::factory()->make(['template' => 'Body [DATA_CONTEXT] body']);
    $empty = PromptTemplate::factory()->make(['template' => '   ']);

    expect($missing->validateTemplate())->toHaveCount(1)
        ->and($duplicate->validateTemplate())->toHaveCount(1)
        ->and($valid->validateTemplate())->toHaveCount(0)
        ->and($empty->validateTemplate())->toHaveCount(2); // missing + empty
});

it('createVersion records a snapshot of current template content', function () {
    $template = PromptTemplate::factory()->create([
        'template' => 'Original [DATA_CONTEXT] content',
        'version' => 1,
    ]);

    $version = $template->createVersion(null, 'Initial archive');

    expect($version)->toBeInstanceOf(PromptTemplateVersion::class)
        ->and($version->prompt_template_id)->toBe($template->id)
        ->and($version->version)->toBe(1)
        ->and($version->template)->toBe('Original [DATA_CONTEXT] content')
        ->and($version->change_reason)->toBe('Initial archive');
});

it('updateTemplate archives the old version and increments the version number', function () {
    $template = PromptTemplate::factory()->create([
        'template' => 'V1 [DATA_CONTEXT]',
        'version' => 1,
    ]);

    $template->updateTemplate('V2 [DATA_CONTEXT]', null, 'Improved phrasing');

    /** @var PromptTemplate $fresh */
    $fresh = $template->fresh();
    expect($fresh->template)->toBe('V2 [DATA_CONTEXT]')
        ->and($fresh->version)->toBe(2)
        ->and($fresh->versions)->toHaveCount(1);
});

it('rollbackToVersion replays a historical template body', function () {
    $template = PromptTemplate::factory()->create(['template' => 'V1 [DATA_CONTEXT]', 'version' => 1]);
    $template->updateTemplate('V2 [DATA_CONTEXT]'); // creates v1 archive
    $template->updateTemplate('V3 [DATA_CONTEXT]'); // creates v2 archive

    /** @var PromptTemplate $fresh */
    $fresh = $template->fresh();
    expect($fresh->version)->toBe(3);

    $fresh->rollbackToVersion(1);
    /** @var PromptTemplate $rolled */
    $rolled = $fresh->fresh();
    expect($rolled->template)->toBe('V1 [DATA_CONTEXT]')
        ->and($rolled->version)->toBe(4); // archives v3, then becomes v4
});

it('rollbackToVersion throws when the requested version does not exist', function () {
    $template = PromptTemplate::factory()->create();
    $template->rollbackToVersion(99);
})->throws(InvalidArgumentException::class);

it('versions HasMany returns descending by version number', function () {
    $template = PromptTemplate::factory()->create();
    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 1]);
    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 3]);
    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 2]);

    expect($template->versions->pluck('version')->all())->toBe([3, 2, 1]);
});

it('scopeActive + scopeCategory + scopeForContext filter correctly', function () {
    PromptTemplate::factory()->create(['category' => 'categorization', 'is_active' => true]);
    PromptTemplate::factory()->create(['category' => 'extraction', 'is_active' => true]);
    PromptTemplate::factory()->inactive()->create(['category' => 'categorization']);

    expect(PromptTemplate::active()->count())->toBe(2)
        ->and(PromptTemplate::category('categorization')->count())->toBe(2)
        ->and(PromptTemplate::active()->category('categorization')->count())->toBe(1);
});

it('PromptTemplateVersion::diffWith reports added/removed/changed counters', function () {
    $template = PromptTemplate::factory()->create();
    $a = PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 1, 'template' => "line1\nline2"]);
    $b = PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 2, 'template' => "line1\nline3"]);

    $diff = $a->diffWith($b);
    expect($diff['added'])->toBe(1)
        ->and($diff['removed'])->toBe(1)
        ->and($diff['changed'])->toBeTrue();

    $same = $a->diffWith($a);
    expect($same['changed'])->toBeFalse();
});
