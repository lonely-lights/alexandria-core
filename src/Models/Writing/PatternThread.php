<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\PatternThreadFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Entry;
use Eloquent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;

/**
 * One live instance of a pattern card in the story — Task 1.
 *
 * Threads are scoped to a narrative node (WorkSection, Work, or Entry
 * in the compendium tree). Marks pin the thread's moments (setup /
 * development / payoff) to real sections within or under that scope.
 *
 * @property int $id
 * @property int $project_id
 * @property int $pattern_card_id
 * @property string $title
 * @property string|null $stance
 * @property string $scope_type
 * @property int $scope_id
 * @property int|null $entry_id
 * @property string|null $notes
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read PatternCard $card
 * @property-read Model $scope
 * @property-read Entry|null $entry
 * @property-read Collection<int, PatternMark> $marks
 * @property-read Authenticatable $creator
 *
 * @mixin Eloquent
 */
class PatternThread extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): PatternThreadFactory
    {
        return PatternThreadFactory::new();
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(PatternCard::class, 'pattern_card_id');
    }

    public function scope(): MorphTo
    {
        return $this->morphTo('scope', 'scope_type', 'scope_id');
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function marks(): HasMany
    {
        return $this->hasMany(PatternMark::class, 'pattern_thread_id')->orderBy('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            config('auth.providers.users.model', Authenticatable::class),
            'created_by',
        );
    }
}
