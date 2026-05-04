<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\ProjectSortingPromptFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Per-project, user-editable preamble that the BlueprintClassifierAgent
 * prepends to its system instructions when the project has a default+active
 * prompt configured. is_default tracks the active fallback per project;
 * is_active gates inclusion.
 *
 * @property int $id
 * @property int $project_id
 * @property string $name
 * @property string $instructions
 * @property bool $is_default
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 *
 * @method static ProjectSortingPromptFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static ProjectSortingPrompt create(array $attributes = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static> query()
 * @method static \Illuminate\Database\Eloquent\Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static \Illuminate\Database\Eloquent\Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static ProjectSortingPrompt|null find(mixed $id, array|string $columns = ['*'])
 * @method static ProjectSortingPrompt findOrFail(mixed $id, array|string $columns = ['*'])
 */
class ProjectSortingPrompt extends Model
{
    use HasFactory;

    protected $table = 'project_sorting_prompts';

    protected $guarded = ['id'];

    protected static function newFactory(): ProjectSortingPromptFactory
    {
        return ProjectSortingPromptFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
