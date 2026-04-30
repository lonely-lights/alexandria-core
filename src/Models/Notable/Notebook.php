<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NotebookFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Notebook Model
 *
 * A collection of notes that can be attached to projects, blueprints, or entries.
 *
 * @property int $id
 * @property int $project_id
 * @property int|null $user_id
 * @property string $title
 * @property string|null $description
 * @property string|null $color
 * @property string|null $icon
 * @property string $status
 * @property bool $is_pinned
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

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
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
