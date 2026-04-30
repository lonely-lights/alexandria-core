<?php

declare(strict_types=1);

/**
 * @noinspection PhpUnhandledExceptionInspection
 */

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Services\AI\AiCommandFactory;
use Illuminate\Auth\GenericUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

/**
 * Tiny stand-in for a host-app User model. The factory only ever reads ->id,
 * which GenericUser exposes via the Authenticatable contract + magic getter.
 */
function makeAuthUser(int $id = 1): GenericUser
{
    return new GenericUser(['id' => $id]);
}

// ---------------------------------------------------------------------------
// createBatchFromJson — happy paths
// ---------------------------------------------------------------------------

it('creates AiReviewCommand rows for each command in the array', function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'first',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Aragorn'],
            ],
        ],
        [
            'action_type' => 'create_entry',
            'reasoning' => 'second',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Arwen'],
            ],
        ],
    ], makeAuthUser());

    expect(AiReviewCommand::query()->where('batch_id', $batchId)->count())->toBe(2);
});

it('returns a UUID batch_id shared by all created rows', function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'A'],
            ],
        ],
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'B'],
            ],
        ],
    ], makeAuthUser());

    expect($batchId)->toMatch('/^[0-9a-f-]{36}$/i');

    $rows = AiReviewCommand::query()->where('batch_id', $batchId)->get();
    expect($rows->pluck('batch_id')->unique())->toHaveCount(1);
});

it('persists user_id, status=pending, and project context from the optional Project', function () {
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Aragorn'],
            ],
        ],
    ], makeAuthUser(42), $project);

    $row = AiReviewCommand::query()->where('batch_id', $batchId)->firstOrFail();

    expect($row->user_id)->toBe(42)
        ->and($row->status)->toBe('pending')
        ->and($row->context)->toBe(['project_id' => $project->id]);
});

it('leaves context empty when no Project is supplied', function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'Aragorn'],
            ],
        ],
    ], makeAuthUser());

    $row = AiReviewCommand::query()->where('batch_id', $batchId)->firstOrFail();

    expect($row->context)->toBe([]);
});

// ---------------------------------------------------------------------------
// Input shapes — root array, 'commands' key, 'suggestions' key
// ---------------------------------------------------------------------------

it('accepts a root-level array of commands', function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'A'],
            ],
        ],
    ], makeAuthUser());

    expect(AiReviewCommand::query()->where('batch_id', $batchId)->count())->toBe(1);
});

it("accepts commands nested under the 'commands' key", function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        'commands' => [
            [
                'action_type' => 'create_entry',
                'reasoning' => 'r',
                'payload' => [
                    'model_class' => Entry::class,
                    'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'A'],
                ],
            ],
        ],
    ], makeAuthUser());

    expect(AiReviewCommand::query()->where('batch_id', $batchId)->count())->toBe(1);
});

it("accepts commands nested under the 'suggestions' key for older prompts", function () {
    $blueprint = Blueprint::factory()->create();

    $batchId = (new AiCommandFactory)->createBatchFromJson([
        'suggestions' => [
            [
                'action_type' => 'create_entry',
                'reasoning' => 'r',
                'payload' => [
                    'model_class' => Entry::class,
                    'attributes' => ['blueprint_id' => $blueprint->id, 'name' => 'A'],
                ],
            ],
        ],
    ], makeAuthUser());

    expect(AiReviewCommand::query()->where('batch_id', $batchId)->count())->toBe(1);
});

it('throws when the commands array is empty', function () {
    (new AiCommandFactory)->createBatchFromJson([], makeAuthUser());
})->throws(Exception::class, 'AI response did not contain a valid array of commands.');

// ---------------------------------------------------------------------------
// validateCommandStructure — basic structural validation
// ---------------------------------------------------------------------------

it('throws ValidationException when action_type is missing', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'payload' => ['foo' => 'bar'],
            'reasoning' => 'r',
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('throws when payload is not an array', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'payload' => 'not an array',
            'reasoning' => 'r',
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('throws when reasoning is missing', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'payload' => ['foo' => 'bar'],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

// ---------------------------------------------------------------------------
// validateActionPayload — routing to the right service
// ---------------------------------------------------------------------------

it('routes note actions through NoteActionService validation', function () {
    // create_note requires target_model_class + target_model_id; missing → throws.
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_note',
            'reasoning' => 'r',
            'payload' => [
                'attributes' => ['title' => 'Hi'],
                // missing target_model_class, target_model_id
            ],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('routes entry actions (create_entry) through EntryActionService validation', function () {
    // create_entry requires model_class and attributes; missing → throws.
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_entry',
            'reasoning' => 'r',
            'payload' => [
                // missing model_class
                'attributes' => ['name' => 'X'],
            ],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('routes legacy create_model alias through EntryActionService validation', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'create_model',
            'reasoning' => 'r',
            'payload' => [
                // missing model_class
                'attributes' => ['name' => 'X'],
            ],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('routes update_entry through EntryActionService validation', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'update_entry',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                // missing model_id and attributes
            ],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('routes legacy update_model alias through EntryActionService validation', function () {
    (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'update_model',
            'reasoning' => 'r',
            'payload' => [
                'model_class' => Entry::class,
                // missing model_id and attributes
            ],
        ],
    ], makeAuthUser());
})->throws(ValidationException::class);

it('passes a well-formed transfer_note through validation and creates the row', function () {
    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'transfer_note',
            'reasoning' => 'r',
            'payload' => [
                'note_id' => 1,
                'target_model_class' => Project::class,
                'target_model_id' => 1,
            ],
        ],
    ], makeAuthUser());

    $row = AiReviewCommand::query()->where('batch_id', $batchId)->firstOrFail();
    expect($row->action_type)->toBe('transfer_note');
});

it('passes unknown action types through (no validation, no error)', function () {
    // Default arm is null — validation is skipped, but the row is still created.
    $batchId = (new AiCommandFactory)->createBatchFromJson([
        [
            'action_type' => 'totally_made_up_action',
            'reasoning' => 'r',
            'payload' => ['anything' => 'goes'],
        ],
    ], makeAuthUser());

    $row = AiReviewCommand::query()->where('batch_id', $batchId)->firstOrFail();
    expect($row->action_type)->toBe('totally_made_up_action');
});
