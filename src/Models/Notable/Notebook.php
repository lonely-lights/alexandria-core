<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NotebookFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Notebook Model
 *
 * A collection of notes that can be attached to projects, blueprints, or entries.
 *
 * @property int $id
 * @property int $project_id
 * @property int|null $user_id
 * @property string $title
 * @property string|null $slug
 * @property string|null $description
 * @property string|null $color
 * @property string|null $icon
 * @property string $status
 * @property bool $is_pinned
 * @property bool $allow_ai_sort
 * @property bool $is_catch_all
 * @property int $sort_order
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read int|null $notes_count
 * @property-read Project $project
 * @property-read Model|null $creator
 * @property-read Collection<int, Note> $notes
 * @property-read Collection<int, Project> $projects
 * @property-read Collection<int, Blueprint> $blueprints
 * @property-read Collection<int, Entry> $entries
 *
 * @method static NotebookFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Notebook create(array $attributes = [])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static Notebook|null find(mixed $id, array|string $columns = ['*'])
 * @method static Notebook findOrFail(mixed $id, array|string $columns = ['*'])
 */
class Notebook extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): NotebookFactory
    {
        return NotebookFactory::new();
    }

    /**
     * Generate a slug from the title on create when one is not supplied.
     * Mirrors the Project model's slug-on-create convention (no extra package
     * dependency). The slug is the notebook's stable routing token and the
     * identifier the AI sorter returns when filing a note to this notebook.
     */
    protected static function booted(): void
    {
        static::creating(function (Notebook $notebook): void {
            if (empty($notebook->slug) && ! empty($notebook->title)) {
                $notebook->slug = Str::slug($notebook->title);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'allow_ai_sort' => 'boolean',
            'is_catch_all' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function notes(): BelongsToMany
    {
        return $this->belongsToMany(Note::class, 'notebook_notes')
            ->withPivot('sort_order', 'added_at')
            ->orderByPivot('sort_order');
    }

    public function projects(): MorphToMany
    {
        return $this->morphedByMany(Project::class, 'notable', 'notebook_notables');
    }

    public function blueprints(): MorphToMany
    {
        return $this->morphedByMany(Blueprint::class, 'notable', 'notebook_notables');
    }

    public function entries(): MorphToMany
    {
        return $this->morphedByMany(Entry::class, 'notable', 'notebook_notables');
    }
}
