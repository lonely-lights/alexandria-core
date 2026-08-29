<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\PatternCardFactory;
use Alexandria\Core\Models\Framework\Project;
use Eloquent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A pattern (device or trope) in the project's library — Task 1.
 *
 * Cards define the archetypes (Chekhov's gun, red herring, etc.) that
 * writers use to structure their narratives. Threads link cards to
 * specific instances in the story. is_seeded marks cards shipped with
 * the app; seeded cards are fully editable and deletable like any
 * user-created card.
 *
 * @property int $id
 * @property int $project_id
 * @property string $name
 * @property string $slug
 * @property string $kind
 * @property string $definition
 * @property string $craft_guidance
 * @property string $pitfalls
 * @property string|null $shape
 * @property bool $is_seeded
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read Collection<int, PatternThread> $threads
 *
 * @mixin Eloquent
 */
class PatternCard extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): PatternCardFactory
    {
        return PatternCardFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_seeded' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function threads(): HasMany
    {
        return $this->hasMany(PatternThread::class);
    }
}
