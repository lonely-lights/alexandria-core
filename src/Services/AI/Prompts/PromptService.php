<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts;

use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Services\AI\Prompts\Builders\DataMarker;
use Alexandria\Core\Services\AI\Prompts\Contexts\ContextInterface;
use Alexandria\Core\Services\AI\Prompts\Exceptions\ContextMismatchException;
use Alexandria\Core\Services\AI\Prompts\Exceptions\ContextValidationException;
use Alexandria\Core\Services\AI\Prompts\Exceptions\PromptNotFoundException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Prompt Service
 *
 * Main service for building prompts with context data.
 * This service ensures clean separation between prompt templates
 * (instructions) and data context (the information being analyzed).
 *
 * Usage:
 * ```php
 * $context = new ProjectCategorizationContext($project, $note);
 * $prompt = app(PromptService::class)->build('notes.categorize.project_level', $context);
 * ```
 */
readonly class PromptService
{
    public function __construct(
        private PromptRepository $repository,
        private DataMarker $marker,
    ) {}

    /**
     * Build a complete prompt with context data.
     *
     * @param  string  $promptKey  The prompt template key
     * @param  ContextInterface  $context  The data context
     * @return string The assembled prompt ready for AI consumption
     *
     * @throws PromptNotFoundException If template doesn't exist
     * @throws ContextMismatchException If context type doesn't match
     * @throws ContextValidationException If context data fails validation
     */
    public function build(string $promptKey, ContextInterface $context): string
    {
        // 1. Load the prompt template
        $template = $this->repository->findByKey($promptKey);

        // 2. Validate context type matches
        $this->validateContextType($template, $context);

        // 3. Validate context data against schema (if schema exists)
        $this->validateContextData($template, $context);

        // 4. Wrap data with clear boundary markers
        $markedData = $this->marker->wrap($context);

        // 5. Inject data into template at [DATA_CONTEXT] placeholder
        $prompt = str_replace('[DATA_CONTEXT]', $markedData, $template->template);

        Log::debug('PromptService: Built prompt', [
            'key' => $promptKey,
            'context_type' => $context->getType(),
            'template_version' => $template->version,
            'prompt_length' => strlen($prompt),
        ]);

        return $prompt;
    }

    /**
     * Build a prompt without validation (for testing/preview).
     *
     * @param  string  $promptKey  The prompt template key
     * @param  ContextInterface  $context  The data context
     * @return string The assembled prompt
     *
     * @throws PromptNotFoundException
     */
    public function buildWithoutValidation(string $promptKey, ContextInterface $context): string
    {
        $template = $this->repository->findByKey($promptKey);
        $markedData = $this->marker->wrap($context);

        return str_replace('[DATA_CONTEXT]', $markedData, $template->template);
    }

    /**
     * Get a prompt template for preview/editing.
     *
     * @throws PromptNotFoundException
     */
    public function getTemplate(string $promptKey): PromptTemplate
    {
        return $this->repository->findByKey($promptKey);
    }

    /**
     * Get a template if it exists, null otherwise.
     */
    public function getTemplateOrNull(string $promptKey): ?PromptTemplate
    {
        return $this->repository->findByKeyOrNull($promptKey);
    }

    /**
     * Update a prompt template (admin only).
     *
     * @param  Model|null  $changedBy  Any user-like Eloquent model — only its id is used.
     *
     * @throws PromptNotFoundException
     */
    public function updateTemplate(
        string $promptKey,
        string $newTemplate,
        ?Model $changedBy = null,
        ?string $reason = null,
    ): PromptTemplate {
        $template = $this->repository->update($promptKey, $newTemplate, $changedBy, $reason);

        Log::info('PromptService: Template updated', [
            'key' => $promptKey,
            'new_version' => $template->version,
            'changed_by' => $changedBy?->getKey(),
            'reason' => $reason,
        ]);

        return $template;
    }

    /**
     * Create a new prompt template.
     *
     * @param  array<string, mixed>  $data  Template data
     */
    public function createTemplate(array $data): PromptTemplate
    {
        $template = $this->repository->create($data);

        Log::info('PromptService: Template created', [
            'key' => $template->key,
            'category' => $template->category,
            'context_type' => $template->required_context_type,
        ]);

        return $template;
    }

    /**
     * Validate that a template's structure is correct.
     *
     * @return array<string> List of validation errors
     */
    public function validateTemplateStructure(PromptTemplate $template): array
    {
        return $template->validateTemplate();
    }

    /**
     * Preview how context data will be wrapped.
     *
     * Useful for testing and debugging.
     */
    public function previewDataContext(ContextInterface $context): string
    {
        return $this->marker->wrap($context);
    }

    /**
     * Get all available prompt categories.
     *
     * @return array<string>
     */
    public function getCategories(): array
    {
        return $this->repository->getCategories();
    }

    /**
     * Register a context schema.
     *
     * Creates or updates the schema definition for a context type.
     *
     * @param  array<string, mixed>  $jsonSchema
     */
    public function registerContextSchema(
        string $type,
        string $version,
        array $jsonSchema,
        ?string $description = null,
    ): PromptContextSchema {
        return $this->repository->findOrCreateSchema($type, $version, $jsonSchema, $description);
    }

    /**
     * Validate that context type matches what template expects.
     *
     * @throws ContextMismatchException
     */
    private function validateContextType(PromptTemplate $template, ContextInterface $context): void
    {
        if ($template->required_context_type !== $context->getType()) {
            throw new ContextMismatchException(
                __("Prompt ':key' requires context type ':expected', but received ':actual'.", [
                    'key' => $template->key,
                    'expected' => $template->required_context_type,
                    'actual' => $context->getType(),
                ])
            );
        }
    }

    /**
     * Validate context data against its schema.
     *
     * @throws ContextValidationException
     */
    private function validateContextData(PromptTemplate $template, ContextInterface $context): void
    {
        $schema = $this->repository->getContextSchema($template);

        // If no schema defined, skip validation
        if (! $schema) {
            Log::debug('PromptService: No schema found for validation', [
                'context_type' => $context->getType(),
                'version' => $template->context_schema_version,
            ]);

            return;
        }

        $result = $schema->validate($context->toArray());

        if (! $result['valid']) {
            throw new ContextValidationException(
                __('Context data validation failed.'),
                $result['errors']
            );
        }
    }
}
