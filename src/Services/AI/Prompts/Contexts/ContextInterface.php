<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Contexts;

/**
 * Context Interface
 *
 * Contract for all prompt context classes. Each context type collects
 * and formats data that will be injected into a prompt template.
 *
 * Context classes are responsible for:
 * 1. Collecting required data from models
 * 2. Formatting data according to the schema
 * 3. Providing metadata about the context type and version
 */
interface ContextInterface
{
    /**
     * Get the context type identifier.
     *
     * This must match the `required_context_type` field in prompt_templates.
     * Example: 'ProjectCategorizationContext'
     */
    public function getType(): string;

    /**
     * Get the schema version this context implements.
     *
     * Example: '1.0'
     */
    public function getVersion(): string;

    /**
     * Convert the context to an array for JSON serialization.
     *
     * This is the data that will be wrapped in DATA_CONTEXT markers
     * and injected into the prompt template.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array;

    /**
     * Get a human-readable description of this context.
     *
     * Used for documentation and debugging.
     */
    public function getDescription(): string;
}
