<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\AI;

use Alexandria\Core\Database\Factories\AI\PromptTemplateFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

/**
 * Prompt Template
 *
 * Stores AI prompt templates with instructions separated from data context.
 * Templates must contain a [DATA_CONTEXT] placeholder for data injection.
 *
 * @property int $id
 * @property string $key Unique identifier (e.g., 'notes.categorize.project_level')
 * @property string $name Human-readable name
 * @property string|null $description What this prompt does
 * @property string $category categorization, extraction, generation, etc.
 * @property string $template The prompt instructions (must contain [DATA_CONTEXT])
 * @property string $required_context_type The context class type required
 * @property string $context_schema_version Version of the context schema
 * @property bool $is_system Whether this is a system prompt (cannot be deleted)
 * @property bool $is_active Whether this prompt is active
 * @property int $version Current version number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, PromptTemplateVersion> $versions
 *
 * @method static Builder<static> active()
 * @method static Builder<static> category(string $category)
 * @method static Builder<static> forContext(string $contextType)
 * @method static PromptTemplateFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static PromptTemplate create(array $attributes = [])
 * @method static PromptTemplate updateOrCreate(array $attributes = [], array $values = [])
 */
class PromptTemplate extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): PromptTemplateFactory
    {
        return PromptTemplateFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
            'version' => 'integer',
        ];
    }

    /**
     * Get all versions of this template.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(PromptTemplateVersion::class)->orderByDesc('version');
    }

    /**
     * Get the context schema for this template.
     */
    public function contextSchema(): ?PromptContextSchema
    {
        return PromptContextSchema::query()
            ->where('type', $this->required_context_type)
            ->where('version', $this->context_schema_version)
            ->first();
    }

    /**
     * Scope to only active templates.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by category.
     */
    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to filter by context type.
     */
    public function scopeForContext(Builder $query, string $contextType): Builder
    {
        return $query->where('required_context_type', $contextType);
    }

    /**
     * Find a template by its unique key.
     */
    public static function findByKey(string $key): ?self
    {
        return static::query()->where('key', $key)->first();
    }

    /**
     * Check if template contains the required [DATA_CONTEXT] placeholder.
     */
    public function hasDataContextPlaceholder(): bool
    {
        return str_contains($this->template, '[DATA_CONTEXT]');
    }

    /**
     * Count occurrences of [DATA_CONTEXT] placeholder.
     */
    public function countDataContextPlaceholders(): int
    {
        return substr_count($this->template, '[DATA_CONTEXT]');
    }

    /**
     * Validate template structure.
     *
     * @return array<string> List of validation errors
     */
    public function validateTemplate(): array
    {
        $errors = [];

        if (! $this->hasDataContextPlaceholder()) {
            $errors[] = __('Template must contain exactly one [DATA_CONTEXT] placeholder.');
        }

        if ($this->countDataContextPlaceholders() > 1) {
            $errors[] = __('Template must contain exactly one [DATA_CONTEXT] placeholder, found :count.', [
                'count' => $this->countDataContextPlaceholders(),
            ]);
        }

        if (empty(trim($this->template))) {
            $errors[] = __('Template cannot be empty.');
        }

        return $errors;
    }

    /**
     * Create a new version snapshot of the current template content.
     *
     * @param  Model|null  $changedBy  Any user-like Eloquent model — only its id is used.
     */
    public function createVersion(?Model $changedBy = null, ?string $reason = null): PromptTemplateVersion
    {
        return $this->versions()->create([
            'version' => $this->version,
            'template' => $this->template,
            'changed_by' => $changedBy?->getKey(),
            'change_reason' => $reason,
        ]);
    }

    /**
     * Update template content, archive the current version, and increment the version number.
     *
     * @param  Model|null  $changedBy  Any user-like Eloquent model — only its id is used.
     */
    public function updateTemplate(string $newTemplate, ?Model $changedBy = null, ?string $reason = null): self
    {
        // Save current version to history
        $this->createVersion($changedBy, $reason);

        // Update and increment version
        $this->update([
            'template' => $newTemplate,
            'version' => $this->version + 1,
        ]);

        return $this;
    }

    /**
     * Rollback to a specific historical version.
     *
     * @param  Model|null  $changedBy  Any user-like Eloquent model — only its id is used.
     *
     * @throws InvalidArgumentException when the requested version does not exist
     */
    public function rollbackToVersion(int $versionNumber, ?Model $changedBy = null): self
    {
        $version = $this->versions()->where('version', $versionNumber)->first();

        if (! $version) {
            throw new InvalidArgumentException(__('Version :version not found.', ['version' => $versionNumber]));
        }

        return $this->updateTemplate(
            $version->template,
            $changedBy,
            __('Rollback to version :version', ['version' => $versionNumber])
        );
    }
}
