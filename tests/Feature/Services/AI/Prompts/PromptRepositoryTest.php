<?php

declare(strict_types=1);

use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Models\AI\PromptTemplateVersion;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Services\AI\Prompts\Exceptions\PromptNotFoundException;
use Alexandria\Core\Services\AI\Prompts\PromptRepository;
use Alexandria\Core\Tests\Support\FakeUserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('findByKey returns the matching template', function () {
    $template = PromptTemplate::factory()->create(['key' => 'cats.categorize']);

    expect((new PromptRepository)->findByKey('cats.categorize')->id)->toBe($template->id);
});

it('findByKey throws PromptNotFoundException when the key is unknown', function () {
    (new PromptRepository)->findByKey('does.not.exist');
})->throws(PromptNotFoundException::class, 'Prompt template "does.not.exist" not found.');

it('findByKeyOrNull returns null when the key is unknown', function () {
    expect((new PromptRepository)->findByKeyOrNull('still.does.not.exist'))->toBeNull();
});

it('getActive only returns is_active=true rows, ordered by category then name', function () {
    PromptTemplate::factory()->inactive()->create(['key' => 'inactive.one']);
    PromptTemplate::factory()->create(['key' => 'a.one', 'category' => 'extraction', 'name' => 'Z']);
    PromptTemplate::factory()->create(['key' => 'a.two', 'category' => 'categorization', 'name' => 'A']);
    PromptTemplate::factory()->create(['key' => 'a.three', 'category' => 'categorization', 'name' => 'B']);

    $keys = (new PromptRepository)->getActive()->pluck('key')->all();

    expect($keys)->toBe(['a.two', 'a.three', 'a.one'])
        ->and(in_array('inactive.one', $keys, true))->toBeFalse();
});

it('getByCategory returns active rows for that category, sorted by name', function () {
    PromptTemplate::factory()->create(['key' => 'b.one', 'category' => 'categorization', 'name' => 'Beta']);
    PromptTemplate::factory()->create(['key' => 'b.two', 'category' => 'categorization', 'name' => 'Alpha']);
    PromptTemplate::factory()->create(['key' => 'b.three', 'category' => 'extraction', 'name' => 'Gamma']);

    $keys = (new PromptRepository)->getByCategory('categorization')->pluck('key')->all();

    expect($keys)->toBe(['b.two', 'b.one']);
});

it('getByContextType filters via the forContext scope', function () {
    PromptTemplate::factory()->create(['required_context_type' => 'CtxA', 'name' => 'one']);
    PromptTemplate::factory()->create(['required_context_type' => 'CtxA', 'name' => 'two']);
    PromptTemplate::factory()->create(['required_context_type' => 'CtxB', 'name' => 'three']);

    expect((new PromptRepository)->getByContextType('CtxA'))->toHaveCount(2)
        ->and((new PromptRepository)->getByContextType('CtxZ'))->toHaveCount(0);
});

it('create persists a new template via mass assignment', function () {
    $template = (new PromptRepository)->create([
        'key' => 'created.via.repo',
        'name' => 'Repo Created',
        'category' => 'extraction',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'NewCtx',
        'context_schema_version' => '1.0',
    ]);

    expect($template->exists)->toBeTrue()
        ->and(PromptTemplate::findByKey('created.via.repo'))->not->toBeNull();
});

it('update accepts a null changedBy and records a version snapshot', function () {
    PromptTemplate::factory()->create(['key' => 'u.null', 'template' => 'V1 [DATA_CONTEXT]', 'version' => 1]);

    $updated = (new PromptRepository)->update('u.null', 'V2 [DATA_CONTEXT]', null, 'no user');

    expect($updated->template)->toBe('V2 [DATA_CONTEXT]')
        ->and($updated->version)->toBe(2)
        ->and($updated->versions()->count())->toBe(1);
});

it('update accepts a generic FakeUserModel as the changedBy parameter', function () {
    PromptTemplate::factory()->create(['key' => 'u.fake', 'template' => 'V1 [DATA_CONTEXT]', 'version' => 1]);

    // FakeUserModel uses a generic Eloquent Model — proves the widening works
    // without requiring App\Models\Account\User from the legacy host app.
    $fake = new FakeUserModel;
    $fake->id = 99; // not persisted; getKey() reads $id

    $updated = (new PromptRepository)->update('u.fake', 'V2 [DATA_CONTEXT]', $fake, 'fake user');

    expect($updated->version)->toBe(2)
        ->and($updated->versions()->first()->changed_by)->toBe(99);
});

it('update accepts a real Eloquent Model (AiProvider) as the changedBy parameter', function () {
    PromptTemplate::factory()->create(['key' => 'u.real', 'template' => 'V1 [DATA_CONTEXT]', 'version' => 1]);

    // Using a real persisted Eloquent Model proves the widening doesn't depend
    // on a User-shaped class. Only getKey() is read.
    $provider = AiProvider::factory()->create();

    $updated = (new PromptRepository)->update('u.real', 'V2 [DATA_CONTEXT]', $provider, 'provider as user');

    expect($updated->version)->toBe(2)
        ->and($updated->versions()->first()->changed_by)->toBe($provider->getKey());
});

it('update throws PromptNotFoundException when the key does not exist', function () {
    (new PromptRepository)->update('not.there', 'whatever');
})->throws(PromptNotFoundException::class);

it('getContextSchema returns the matching PromptContextSchema, null otherwise', function () {
    $schema = PromptContextSchema::factory()->create(['type' => 'Ctx', 'version' => '1.0']);
    $matching = PromptTemplate::factory()->create([
        'required_context_type' => 'Ctx',
        'context_schema_version' => '1.0',
    ]);
    $unmatched = PromptTemplate::factory()->create([
        'required_context_type' => 'Other',
        'context_schema_version' => '1.0',
    ]);

    expect((new PromptRepository)->getContextSchema($matching)?->id)->toBe($schema->id)
        ->and((new PromptRepository)->getContextSchema($unmatched))->toBeNull();
});

it('getCategories returns distinct, sorted category names', function () {
    PromptTemplate::factory()->create(['category' => 'extraction']);
    PromptTemplate::factory()->create(['category' => 'categorization']);
    PromptTemplate::factory()->create(['category' => 'categorization']);
    PromptTemplate::factory()->create(['category' => 'generation']);

    expect((new PromptRepository)->getCategories())
        ->toBe(['categorization', 'extraction', 'generation']);
});

it('findOrCreateSchema creates a new schema when not present, returns the existing one otherwise', function () {
    $repo = new PromptRepository;

    $a = $repo->findOrCreateSchema('TypeA', '1.0', ['required' => ['x']], 'first');
    expect($a->exists)->toBeTrue();

    // Second call with the same type+version returns the same row, doesn't dupe.
    $b = $repo->findOrCreateSchema('TypeA', '1.0', ['required' => ['y']], 'should be ignored');
    expect($b->id)->toBe($a->id);
});

it('getVersionHistory returns versions ordered descending (HasMany default), respects limit', function () {
    $template = PromptTemplate::factory()->create(['key' => 'vh.test']);

    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 1]);
    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 2]);
    PromptTemplateVersion::factory()->forTemplate($template)->create(['version' => 3]);

    $history = (new PromptRepository)->getVersionHistory('vh.test', 2);

    expect($history)->toHaveCount(2)
        ->and($history->pluck('version')->all())->toBe([3, 2]);
});

it('getVersionHistory throws PromptNotFoundException when the key does not exist', function () {
    (new PromptRepository)->getVersionHistory('absent');
})->throws(PromptNotFoundException::class);
