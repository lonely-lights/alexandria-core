<?php

declare(strict_types=1);

/**
 * Pest test file for AiCommandExecutor.
 */

use Alexandria\Core\Exceptions\BatchExecutionException;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\Notable\Notebook;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Services\AI\AiCommandExecutor;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// executeBatch — empty / no-op cases
// ---------------------------------------------------------------------------

it('returns zeroed counts when no approved commands exist for the batch', function () {
    $batchId = (string) Str::uuid();

    // Even pending rows should be ignored.
    AiReviewCommand::factory()->forBatch($batchId)->pending()->create();

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 0, 'failed' => 0]);
});

// ---------------------------------------------------------------------------
// executeBatch — happy path: single create_entry
// ---------------------------------------------------------------------------

it('executes a single approved create_entry, marks it executed, and stamps executed_at', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $command = AiReviewCommand::factory()
        ->forBatch($batchId)
        ->approved()
        ->create([
            'action_type' => 'create_entry',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => [
                    'blueprint_id' => $blueprint->id,
                    'project_id' => $project->id,
                    'name' => 'Aragorn',
                ],
            ],
        ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 0]);

    $command->refresh();
    expect($command->status)->toBe('executed')
        ->and($command->executed_at)->not->toBeNull()
        ->and(Entry::query()->where('name', 'Aragorn')->exists())->toBeTrue();
});

// ---------------------------------------------------------------------------
// executeBatch — mixed batch: create_entry + create_relationship
// ---------------------------------------------------------------------------

it('executes a mixed batch (create_entry + create_relationship) successfully', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $aragorn = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();
    $arwen = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Eowyn',
            ],
        ],
    ]);

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_relationship',
        'payload' => [
            'parent_entry_id' => $aragorn->id,
            'child_entry_id' => $arwen->id,
            'relationship_type' => 'spouse',
            'parent_label' => 'Husband',
            'child_label' => 'Wife',
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 2, 'failed' => 0])
        ->and(EntryRelationship::query()
            ->where('parent_entry_id', $aragorn->id)
            ->where('child_entry_id', $arwen->id)
            ->where('relationship_type', 'spouse')
            ->exists())->toBeTrue();
});

// ---------------------------------------------------------------------------
// Failed command isolation: one bad command does not abort the batch
// ---------------------------------------------------------------------------

it('marks an individually-failing command as failed but still executes others', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $bad = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_relationship',
        'payload' => [
            // Missing required fields → handleCreateRelationship throws.
            'parent_entry_id' => 1,
        ],
    ]);

    $good = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'SurvivedSibling',
            ],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 1]);

    $bad->refresh();
    $good->refresh();

    expect($bad->status)->toBe('failed')
        ->and($bad->failure_reason)->not->toBeEmpty()
        ->and($good->status)->toBe('executed')
        ->and(Entry::query()->where('name', 'SurvivedSibling')->exists())->toBeTrue();
});

// ---------------------------------------------------------------------------
// Database rollback path
// ---------------------------------------------------------------------------

it('rolls back the transaction when the outer commit phase fails', function () {
    // The outer try/catch in executeBatch fires only if something between
    // DB::commit() and the closing brace throws — not the inner per-command
    // try/catch. With deferred relationships still scaffolding, there's no
    // production code path that triggers it without heavy mocking. Skipping
    // until a deferred-relationship processor lands and gives us a concrete
    // failure surface.
    //
    // When this test is unblocked, assert that the wrapper exception is
    // BatchExecutionException::class (the original Throwable is preserved
    // as $previous) — see AiCommandExecutor::executeBatch().
    expect(BatchExecutionException::class)->toBe(BatchExecutionException::class);
})->skip('TODO: needs deferred-relationship processor integration to exercise outer rollback path.');

// ---------------------------------------------------------------------------
// tempIdMap resolution across commands
// ---------------------------------------------------------------------------

it('resolves a temp_id from an earlier create_entry into a later update_entry', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'temp_1',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Created First',
            ],
        ],
    ]);

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'update_entry',
        'payload' => [
            'model_class' => Entry::class,
            'model_id' => 'temp_1',
            'attributes' => ['summary' => 'Updated via temp_id'],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 2, 'failed' => 0]);

    $entry = Entry::query()->where('name', 'Created First')->firstOrFail();
    expect($entry->summary)->toBe('Updated via temp_id');
});

it('marks a command as failed when its model_id references an unresolved temp_id', function () {
    $batchId = (string) Str::uuid();

    $command = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'update_entry',
        'payload' => [
            'model_class' => Entry::class,
            'model_id' => 'never_seen_temp_id',
            'attributes' => ['summary' => 'noop'],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 0, 'failed' => 1]);

    $command->refresh();
    expect($command->status)->toBe('failed')
        ->and($command->failure_reason)->toContain('Unresolved temporary ID');
});

// ---------------------------------------------------------------------------
// attach_relationship — BelongsToMany path via Note <-> Notebook
// ---------------------------------------------------------------------------

it('attaches via BelongsToMany when payload targets a many-to-many relationship', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $notebook = Notebook::factory()->forProject($project)->create();
    $note = Note::factory()->create();

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'attach_relationship',
        'payload' => [
            'parent_model_class' => Notebook::class,
            'parent_model_id' => $notebook->id,
            'relationship_name' => 'notes',
            'child_model_id' => $note->id,
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 0]);

    $notebook->refresh();
    expect($notebook->notes()->where('notes.id', $note->id)->exists())->toBeTrue();
});

it('skips the one-to-many attach_relationship path because no core model implements findParentModel()', function () {
    // The legacy convention required a `findParentModel()` accessor on the
    // child model, which no core fixture currently provides. Skipping until a
    // host-app or fixture model supplies that contract.
    expect(true)->toBeTrue();
})->skip('TODO: requires a fixture model exposing findParentModel(); none in core.');

// ---------------------------------------------------------------------------
// create_relationship — direct entry_relationships row
// ---------------------------------------------------------------------------

it('chains create_entry (temp_id) → create_relationship by resolving the temp_id into the new entry id', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // The child entry pre-exists; only the parent gets created in the batch.
    $existingChild = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    // Command 1: create_entry with temp_id — this is the row whose new id
    // must be threaded into command 2 via tempIdMap.
    $createCmd = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'temp_alice',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Alice',
            ],
        ],
    ]);

    // Command 2: create_relationship referencing the temp_id from command 1
    // via parent_entry_temp_id (which executeCommand resolves into parent_entry_id).
    $relCmd = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_relationship',
        'payload' => [
            'parent_entry_temp_id' => 'temp_alice',
            'child_entry_id' => $existingChild->id,
            'relationship_type' => 'mentor',
            'parent_label' => 'Mentor',
            'child_label' => 'Apprentice',
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 2, 'failed' => 0]);

    $createCmd->refresh();
    $relCmd->refresh();
    expect($createCmd->status)->toBe('executed')
        ->and($relCmd->status)->toBe('executed');

    $alice = Entry::query()->where('name', 'Alice')->firstOrFail();

    $row = EntryRelationship::query()
        ->where('parent_entry_id', $alice->id)
        ->where('child_entry_id', $existingChild->id)
        ->firstOrFail();

    expect($row->relationship_type)->toBe('mentor')
        ->and($row->parent_label)->toBe('Mentor')
        ->and($row->child_label)->toBe('Apprentice');
});

it('creates an entry_relationships row with the supplied parent/child IDs and metadata', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();
    $parent = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();
    $child = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_relationship',
        'payload' => [
            'parent_entry_id' => $parent->id,
            'child_entry_id' => $child->id,
            'relationship_type' => 'mentor',
            'parent_label' => 'Mentor',
            'child_label' => 'Apprentice',
            'metadata' => ['since' => 'TA 2950'],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 0]);

    $row = EntryRelationship::query()
        ->where('parent_entry_id', $parent->id)
        ->where('child_entry_id', $child->id)
        ->firstOrFail();

    expect($row->relationship_type)->toBe('mentor')
        ->and($row->parent_label)->toBe('Mentor')
        ->and($row->child_label)->toBe('Apprentice')
        ->and($row->metadata)->toBe(['since' => 'TA 2950']);
});

// ---------------------------------------------------------------------------
// Dedup guard: create_entry skips when a live entry with the same slug exists
// ---------------------------------------------------------------------------

it('dedup guard skips creation and marks command executed when a live entry with same slug exists', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // Pre-existing live entry whose slug matches Str::slug('Rivendell') = 'rivendell'.
    $existing = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'name' => 'Rivendell',
        'slug' => 'rivendell',
    ]);

    $command = AiReviewCommand::factory()
        ->forBatch($batchId)
        ->approved()
        ->create([
            'action_type' => 'create_entry',
            'reasoning' => 'Original reasoning.',
            'payload' => [
                'model_class' => Entry::class,
                'temp_id' => 'temp_rivendell',
                'attributes' => [
                    'blueprint_id' => $blueprint->id,
                    'project_id' => $project->id,
                    'name' => 'Rivendell',
                ],
            ],
        ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    // Command counted as success (not failed), marked executed.
    expect($result)->toBe(['success' => 1, 'failed' => 0]);

    $command->refresh();
    expect($command->status)->toBe('executed')
        ->and($command->executed_at)->not->toBeNull()
        ->and(Entry::query()
            ->where('project_id', $project->id)
            ->where('blueprint_id', $blueprint->id)
            ->where('slug', 'rivendell')
            ->count())->toBe(1);

    // No second entry created.
});

it('dedup guard annotates reasoning with [dedup: matched existing #id]', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    $existing = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'name' => 'Minas Tirith',
        'slug' => 'minas-tirith',
    ]);

    $command = AiReviewCommand::factory()
        ->forBatch($batchId)
        ->approved()
        ->create([
            'action_type' => 'create_entry',
            'reasoning' => 'Looks like a new location.',
            'payload' => [
                'model_class' => Entry::class,
                'attributes' => [
                    'blueprint_id' => $blueprint->id,
                    'project_id' => $project->id,
                    'name' => 'Minas Tirith',
                ],
            ],
        ]);

    (new AiCommandExecutor)->executeBatch($batchId);

    $command->refresh();
    expect($command->reasoning)->toContain('[dedup: matched existing #'.$existing->id.']');
});

it('dedup guard maps temp_id to existing entry so a following create_relationship resolves to it', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // Pre-existing entry whose slug will match the create_entry command.
    $existing = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'name' => 'Gondor',
        'slug' => 'gondor',
    ]);
    $child = Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create();

    // Command 1: create_entry that will be dedup'd - temp_id must map to $existing->id.
    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'temp_id' => 'temp_gondor',
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Gondor',
            ],
        ],
    ]);

    // Command 2: create_relationship using the temp_id from command 1.
    $relCmd = AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_relationship',
        'payload' => [
            'parent_entry_temp_id' => 'temp_gondor',
            'child_entry_id' => $child->id,
            'relationship_type' => 'contains',
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 2, 'failed' => 0]);

    $relCmd->refresh();
    expect($relCmd->status)->toBe('executed')
        ->and(EntryRelationship::query()
            ->where('parent_entry_id', $existing->id)
            ->where('child_entry_id', $child->id)
            ->where('relationship_type', 'contains')
            ->exists())->toBeTrue();

    // The relationship must point at the PRE-EXISTING entry, not a newly created one.
});

it('dedup guard does not fire for a non-duplicate name - new entry is created normally', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // Pre-existing entry with a DIFFERENT name/slug.
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'name' => 'Rohan',
        'slug' => 'rohan',
    ]);

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Gondor',
            ],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 0])
        ->and(Entry::query()->where('name', 'Gondor')->exists())->toBeTrue();
});

it('dedup guard does not match an archived entry - a new entry is created', function () {
    $batchId = (string) Str::uuid();
    $project = Project::factory()->create();
    $blueprint = Blueprint::factory()->forProject($project)->create();

    // Archived entry with the same slug - should NOT block creation.
    Entry::factory()->inProjectWithBlueprint($project, $blueprint)->create([
        'name' => 'Osgiliath',
        'slug' => 'osgiliath',
        'archived_at' => now(),
    ]);

    AiReviewCommand::factory()->forBatch($batchId)->approved()->create([
        'action_type' => 'create_entry',
        'payload' => [
            'model_class' => Entry::class,
            'attributes' => [
                'blueprint_id' => $blueprint->id,
                'project_id' => $project->id,
                'name' => 'Osgiliath',
            ],
        ],
    ]);

    $result = (new AiCommandExecutor)->executeBatch($batchId);

    expect($result)->toBe(['success' => 1, 'failed' => 0])
        ->and(Entry::query()
            ->whereNull('archived_at')
            ->where('name', 'Osgiliath')
            ->exists())->toBeTrue();
});
