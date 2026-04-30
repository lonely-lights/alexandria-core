<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts;

use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Models\AI\PromptTemplateVersion;
use Alexandria\Core\Services\AI\Prompts\Exceptions\PromptNotFoundException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Prompt Repository
 *
 * Database access layer for prompt templates and related entities.
 */
class PromptRepository
{
    /**
     * Find a template by its unique key.
     *
     * @throws PromptNotFoundException
     */
    public function findByKey(string $key): PromptTemplate
    {
        $template = PromptTemplate::findByKey($key);

        if (! $template) {
            throw new PromptNotFoundException(__('Prompt template ":key" not found.', ['key' => $key]));
        }

        return $template;
    }

    /**
     * Find a template by key, returning null if not found.
     */
    public function findByKeyOrNull(string $key): ?PromptTemplate
    {
        return PromptTemplate::findByKey($key);
    }

    /**
     * Get all active templates.
     *
     * @return Collection<int, PromptTemplate>
     */
    public function getActive(): Collection
    {
        return PromptTemplate::active()->orderBy('category')->orderBy('name')->get();
    }

    /**
     * Get templates by category.
     *
     * @return Collection<int, PromptTemplate>
     */
    public function getByCategory(string $category): Collection
    {
        return PromptTemplate::active()->category($category)->orderBy('name')->get();
    }

    /**
     * Get templates that require a specific context type.
     *
     * @return Collection<int, PromptTemplate>
     */
    public function getByContextType(string $contextType): Collection
    {
        return PromptTemplate::active()->forContext($contextType)->orderBy('name')->get();
    }

    /**
     * Create a new template.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): PromptTemplate
    {
        return PromptTemplate::create($data);
    }

    /**
     * Update a template's content.
     *
     * @param  Model|null  $changedBy  Any user-like Eloquent model — only its id is used.
     *
     * @throws PromptNotFoundException
     */
    public function update(string $key, string $newTemplate, ?Model $changedBy = null, ?string $reason = null): PromptTemplate
    {
        $template = $this->findByKey($key);

        return $template->updateTemplate($newTemplate, $changedBy, $reason);
    }

    /**
     * Get the context schema for a template.
     */
    public function getContextSchema(PromptTemplate $template): ?PromptContextSchema
    {
        return PromptContextSchema::findByTypeAndVersion(
            $template->required_context_type,
            $template->context_schema_version
        );
    }

    /**
     * Get all available categories.
     *
     * @return array<string>
     */
    public function getCategories(): array
    {
        return PromptTemplate::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->toArray();
    }

    /**
     * Find or create a context schema.
     *
     * @param  array<string, mixed>  $jsonSchema
     */
    public function findOrCreateSchema(string $type, string $version, array $jsonSchema, ?string $description = null): PromptContextSchema
    {
        return PromptContextSchema::firstOrCreate(
            ['type' => $type, 'version' => $version],
            ['json_schema' => $jsonSchema, 'description' => $description]
        );
    }

    /**
     * Get version history for a template.
     *
     * @return Collection<int, PromptTemplateVersion>
     *
     * @throws PromptNotFoundException
     */
    public function getVersionHistory(string $key, int $limit = 10): Collection
    {
        $template = $this->findByKey($key);

        return $template->versions()->limit($limit)->get();
    }
}
