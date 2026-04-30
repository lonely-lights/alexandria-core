<?php

declare(strict_types=1);

use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Services\AI\Prompts\Builders\DataMarker;
use Alexandria\Core\Services\AI\Prompts\Contexts\AbstractContext;
use Alexandria\Core\Services\AI\Prompts\Exceptions\ContextMismatchException;
use Alexandria\Core\Services\AI\Prompts\Exceptions\ContextValidationException;
use Alexandria\Core\Services\AI\Prompts\Exceptions\PromptNotFoundException;
use Alexandria\Core\Services\AI\Prompts\PromptRepository;
use Alexandria\Core\Services\AI\Prompts\PromptService;
use Alexandria\Core\Tests\Support\FakeUserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Tiny test double — concrete AbstractContext subclass used as a payload
 * for PromptService tests without dragging worldbuilding contexts into core.
 */
function makeServiceTestContext(string $type = 'TestContext', string $version = '1.0', array $payload = ['hello' => 'world']): AbstractContext
{
    return new class($type, $version, $payload) extends AbstractContext
    {
        public function __construct(
            private readonly string $type,
            private readonly string $version,
            private readonly array $payload,
        ) {}

        public function getType(): string
        {
            return $this->type;
        }

        public function getVersion(): string
        {
            return $this->version;
        }

        public function toArray(): array
        {
            return $this->payload;
        }
    };
}

function makePromptService(): PromptService
{
    return new PromptService(new PromptRepository, new DataMarker);
}

it('getTemplate delegates to repository and returns the matching template', function () {
    $template = PromptTemplate::factory()->create(['key' => 'svc.get']);

    expect(makePromptService()->getTemplate('svc.get')->id)->toBe($template->id);
});

it('getTemplate throws PromptNotFoundException when the key does not exist', function () {
    makePromptService()->getTemplate('svc.missing');
})->throws(PromptNotFoundException::class);

it('getTemplateOrNull returns null when the key does not exist', function () {
    expect(makePromptService()->getTemplateOrNull('also.missing'))->toBeNull();
});

it('build substitutes [DATA_CONTEXT] with the wrapped context block', function () {
    PromptTemplate::factory()->create([
        'key' => 'svc.build',
        'template' => "Instructions before.\n\n[DATA_CONTEXT]\n\nInstructions after.",
        'required_context_type' => 'TestContext',
        'context_schema_version' => '1.0',
    ]);

    $prompt = makePromptService()->build('svc.build', makeServiceTestContext());

    expect($prompt)->toContain('Instructions before.')
        ->and($prompt)->toContain('Instructions after.')
        ->and($prompt)->toContain('=== BEGIN DATA CONTEXT')
        ->and($prompt)->toContain('Type: TestContext')
        ->and($prompt)->not->toContain('[DATA_CONTEXT]'); // the placeholder was replaced
});

it('build throws ContextMismatchException when context type does not match required_context_type', function () {
    PromptTemplate::factory()->create([
        'key' => 'svc.mismatch',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'ExpectedType',
    ]);

    makePromptService()->build('svc.mismatch', makeServiceTestContext('WrongType'));
})->throws(ContextMismatchException::class);

it('build throws ContextValidationException when schema validation fails', function () {
    PromptContextSchema::factory()->create([
        'type' => 'StrictContext',
        'version' => '1.0',
        'json_schema' => [
            'required' => ['must_have'],
            'properties' => ['must_have' => ['type' => 'string']],
        ],
    ]);
    PromptTemplate::factory()->create([
        'key' => 'svc.strict',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'StrictContext',
        'context_schema_version' => '1.0',
    ]);

    // Payload omits the required 'must_have' key.
    makePromptService()->build('svc.strict', makeServiceTestContext('StrictContext', '1.0', ['other' => 'val']));
})->throws(ContextValidationException::class);

it('build skips schema validation when no schema is registered for the context type', function () {
    PromptTemplate::factory()->create([
        'key' => 'svc.noschema',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'NoSchemaContext',
        'context_schema_version' => '1.0',
    ]);

    // No PromptContextSchema row exists for NoSchemaContext / 1.0 — should not throw.
    $prompt = makePromptService()->build('svc.noschema', makeServiceTestContext('NoSchemaContext'));

    expect($prompt)->toContain('Body');
});

it('build passes when schema validation succeeds', function () {
    PromptContextSchema::factory()->create([
        'type' => 'PassContext',
        'version' => '1.0',
        'json_schema' => [
            'required' => ['name'],
            'properties' => ['name' => ['type' => 'string']],
        ],
    ]);
    PromptTemplate::factory()->create([
        'key' => 'svc.pass',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'PassContext',
        'context_schema_version' => '1.0',
    ]);

    $prompt = makePromptService()->build('svc.pass', makeServiceTestContext('PassContext', '1.0', ['name' => 'Andrew']));

    expect($prompt)->toContain('"name": "Andrew"');
});

it('buildWithoutValidation skips both type and schema checks', function () {
    PromptTemplate::factory()->create([
        'key' => 'svc.unsafe',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'WouldMismatch',
    ]);

    // type mismatch would normally throw; buildWithoutValidation lets it through.
    $prompt = makePromptService()->buildWithoutValidation('svc.unsafe', makeServiceTestContext('AnythingElse'));

    expect($prompt)->toContain('Body')
        ->and($prompt)->toContain('Type: AnythingElse');
});

it('updateTemplate delegates to repository, accepts ?Model and writes a version', function () {
    PromptTemplate::factory()->create([
        'key' => 'svc.update',
        'template' => 'V1 [DATA_CONTEXT]',
        'version' => 1,
    ]);

    $fake = new FakeUserModel;
    $fake->id = 7;

    $updated = makePromptService()->updateTemplate('svc.update', 'V2 [DATA_CONTEXT]', $fake, 'svc-side reason');

    expect($updated->template)->toBe('V2 [DATA_CONTEXT]')
        ->and($updated->version)->toBe(2)
        ->and($updated->versions()->first()->changed_by)->toBe(7);
});

it('updateTemplate accepts null changedBy', function () {
    PromptTemplate::factory()->create(['key' => 'svc.update.null', 'template' => 'V1 [DATA_CONTEXT]', 'version' => 1]);

    $updated = makePromptService()->updateTemplate('svc.update.null', 'V2 [DATA_CONTEXT]');

    expect($updated->version)->toBe(2);
});

it('createTemplate delegates to repository', function () {
    $template = makePromptService()->createTemplate([
        'key' => 'svc.create',
        'name' => 'Created',
        'category' => 'categorization',
        'template' => 'Body [DATA_CONTEXT]',
        'required_context_type' => 'CreateCtx',
        'context_schema_version' => '1.0',
    ]);

    expect($template->exists)->toBeTrue();
});

it('validateTemplateStructure returns the template-level validation errors', function () {
    $missing = PromptTemplate::factory()->make(['template' => 'no placeholder here']);
    $valid = PromptTemplate::factory()->make(['template' => 'has [DATA_CONTEXT] inside']);

    expect(makePromptService()->validateTemplateStructure($missing))->not->toBe([])
        ->and(makePromptService()->validateTemplateStructure($valid))->toBe([]);
});

it('previewDataContext returns the wrapped data block for a context', function () {
    $preview = makePromptService()->previewDataContext(makeServiceTestContext('PreviewCtx', '1.0', ['k' => 'v']));

    expect($preview)->toContain('Type: PreviewCtx')
        ->and($preview)->toContain('"k": "v"');
});

it('getCategories returns the distinct sorted category list', function () {
    PromptTemplate::factory()->create(['category' => 'b']);
    PromptTemplate::factory()->create(['category' => 'a']);
    PromptTemplate::factory()->create(['category' => 'a']);

    expect(makePromptService()->getCategories())->toBe(['a', 'b']);
});

it('registerContextSchema persists the schema definition', function () {
    $schema = makePromptService()->registerContextSchema(
        'NewlyRegistered',
        '2.0',
        ['required' => ['foo']],
        'schema for tests'
    );

    expect($schema->exists)->toBeTrue()
        ->and(PromptContextSchema::findByTypeAndVersion('NewlyRegistered', '2.0')?->id)->toBe($schema->id);
});
