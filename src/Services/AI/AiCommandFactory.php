<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Services\AI\Actions\EntryActionService;
use Alexandria\Core\Services\AI\Actions\NoteActionService;
use Exception;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Class AiCommandFactory
 *
 * Responsible for validating and creating AiReviewCommand records
 * from structured data, typically from an AI's JSON response.
 */
class AiCommandFactory
{
    private NoteActionService $noteActionService;

    private EntryActionService $entryActionService;

    public function __construct()
    {
        $this->noteActionService = new NoteActionService;
        $this->entryActionService = new EntryActionService;
    }

    /**
     * Creates a batch of AiReviewCommand records from a decoded JSON array.
     *
     * @param  array  $commandsData  The array of command objects from the AI.
     * @param  Authenticatable  $user  The user who initiated the request.
     *                                 // Authenticatable contract is host-agnostic; we only need ->id.
     * @param  Project|null  $context  The project context for this batch.
     * @return string The UUID of the created batch.
     *
     * @throws ValidationException|Exception
     */
    public function createBatchFromJson(array $commandsData, Authenticatable $user, ?Project $context = null): string
    {
        $batchId = (string) Str::uuid();

        $contextData = [];
        if ($context instanceof Project) {
            $contextData = ['project_id' => $context->id];
        }

        // AI may return commands at the root, nested under 'commands', or 'suggestions' (older prompts).
        $actualCommands = $commandsData;
        if (isset($commandsData['commands']) && is_array($commandsData['commands'])) {
            $actualCommands = $commandsData['commands'];
        } elseif (isset($commandsData['suggestions']) && is_array($commandsData['suggestions'])) {
            $actualCommands = $commandsData['suggestions'];
        }

        if (empty($actualCommands)) {
            throw new Exception('AI response did not contain a valid array of commands.');
        }

        // Now, loop over the correctly identified array of commands.
        foreach ($actualCommands as $index => $commandData) {
            Log::info('AiCommandFactory: Processing command', [
                'batch_id' => $batchId,
                'command_index' => $index,
                'action_type' => $commandData['action_type'] ?? 'missing',
                'command_data' => $commandData,
            ]);

            try {
                // 1. Validate the structure of each command object.
                $this->validateCommandStructure($commandData, $index);

                Log::info('AiCommandFactory: Command validation passed', [
                    'batch_id' => $batchId,
                    'command_index' => $index,
                    'action_type' => $commandData['action_type'],
                ]);

                // 2. Create the command record in the database.
                $command = AiReviewCommand::create([
                    'user_id' => $user->id,
                    'batch_id' => $batchId,
                    'status' => 'pending',
                    'context' => $contextData,
                    'action_type' => $commandData['action_type'],
                    'payload' => $commandData['payload'],
                    'reasoning' => $commandData['reasoning'],
                ]);

                Log::info('AiCommandFactory: Command created successfully', [
                    'batch_id' => $batchId,
                    'command_index' => $index,
                    'command_id' => $command->id,
                    'action_type' => $commandData['action_type'],
                ]);

            } catch (Exception $e) {
                Log::error('AiCommandFactory: Command processing failed', [
                    'batch_id' => $batchId,
                    'command_index' => $index,
                    'action_type' => $commandData['action_type'] ?? 'missing',
                    'error' => $e->getMessage(),
                    'command_data' => $commandData,
                ]);

                // Re-throw to maintain error handling behavior
                throw $e;
            }
        }

        return $batchId;
    }

    /**
     * Validates that a single command object from the AI has the required keys and types.
     *
     * @param  int  $index  The index of the command in the batch for error reporting.
     *
     * @throws ValidationException
     */
    private function validateCommandStructure(array $commandData, int $index): void
    {
        Log::info('AiCommandFactory: Validating command structure', [
            'command_index' => $index,
            'command_keys' => array_keys($commandData),
            'action_type' => $commandData['action_type'] ?? 'missing',
        ]);

        $validator = Validator::make($commandData, [
            'action_type' => ['required', 'string'],
            'payload' => ['required', 'array'],
            'reasoning' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            Log::error('AiCommandFactory: Basic structure validation failed', [
                'command_index' => $index,
                'errors' => $validator->errors()->toArray(),
                'command_data' => $commandData,
            ]);

            // The validator already exposes field-level errors; the contextual
            // message was decorative and the response() factory is unsafe in
            // queue/CLI contexts.
            throw new ValidationException($validator);
        }

        // Validate action-specific payload structure
        $this->validateActionPayload($commandData['action_type'], $commandData['payload'], $index);
    }

    /**
     * Validates payload structure for specific action types.
     *
     * @throws ValidationException
     */
    private function validateActionPayload(string $actionType, array $payload, int $index): void
    {
        // Delegate validations to appropriate services
        match ($actionType) {
            // Note operations
            'create_note' => $this->noteActionService->validateCreateNote($payload, $index),
            'copy_note' => $this->noteActionService->validateCopyNote($payload, $index),
            'move_note' => $this->noteActionService->validateMoveNote($payload, $index),
            'transfer_note' => $this->noteActionService->validateTransferNote($payload, $index),
            // Entry operations (new names)
            'create_entry' => $this->entryActionService->validateCreateEntry($payload, $index),
            'update_entry' => $this->entryActionService->validateUpdateEntry($payload, $index),
            // Entry operations (backward compatibility)
            'create_model' => $this->entryActionService->validateCreateEntry($payload, $index),
            'update_model' => $this->entryActionService->validateUpdateEntry($payload, $index),
            // Note: create_relationship removed - relationships now deferred to final processing
            default => null // No specific validation for other action types
        };
    }
}
