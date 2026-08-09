<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\WorkFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Traits\Notable\HasNotes;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A written work (novel, screenplay, essay, ...) — Stage 8g.1.
 *
 * Works are first-class and decoupled from the EAV worldbuilding
 * structure: they belong to exactly one project and hold a
 * user-controlled tree of WorkSections. word_count is a cached
 * rollup maintained by WorkSectionContentService.
 *
 * Notes attach to a work through the `notables` pivot (HasNotes), the
 * same polymorphic seam WorkSection uses — a work-level note is the
 * whole-manuscript counterpart to a section-level one.
 *
 * @property int $id
 * @property int $project_id
 * @property int $user_id
 * @property int|null $entry_id
 * @property string $title
 * @property string $slug
 * @property string $type
 * @property string $format
 * @property string|null $logline
 * @property string|null $genre
 * @property string $status
 * @property string|null $target_audience
 * @property string|null $language
 * @property string|null $setting_period
 * @property array<string, mixed>|null $length_plan
 * @property int|null $target_words
 * @property int $word_count
 * @property int $line_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Entry|null $entry
 * @property-read Project $project
 * @property-read Model $user
 * @property-read Collection<int, WorkSection> $sections
 * @property-read Collection<int, WorkSection> $rootSections
 * @property-read Collection<int, WorkEntryPin> $pins
 * @property-read Collection<int, Note> $notes
 * @property-read int|null $sections_count
 *
 * @method static WorkFactory factory($count = null, $state = [])
 *
 * @mixin \Eloquent
 */
class Work extends Model
{
    use HasFactory;
    use HasNotes;
    use SoftDeletes;

    public const string STATUS_CONCEPT = 'concept';

    public const string STATUS_DRAFTING = 'drafting';

    public const string STATUS_REVISING = 'revising';

    public const string STATUS_COMPLETE = 'complete';

    public const string FORMAT_PROSE = 'prose';

    public const string FORMAT_SCREENPLAY = 'screenplay';

    protected $guarded = ['id'];

    /**
     * Mirror the DB column defaults so freshly created in-memory
     * instances match what gets persisted (status assertion-safe
     * without a refresh()).
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'type' => 'novel',
        'format' => self::FORMAT_PROSE,
        'status' => self::STATUS_CONCEPT,
        'word_count' => 0,
        'line_count' => 0,
    ];

    protected function casts(): array
    {
        return [
            'length_plan' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $work) {
            if (empty($work->slug) && ! empty($work->title)) {
                $work->slug = static::generateUniqueSlug($work->title, $work->project_id);
            }
        });

        static::updating(function (self $work) {
            if ($work->isDirty('title') && ! $work->isDirty('slug')) {
                $work->slug = static::generateUniqueSlug($work->title, $work->project_id, $work->id);
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * The structure entry this work is linked to (e.g. its Compendium
     * medium entry). Canonical direction: work -> entry; the entry side
     * is derived by query.
     */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(WorkSection::class)->orderBy('position');
    }

    public function rootSections(): HasMany
    {
        return $this->sections()->whereNull('parent_id');
    }

    public function pins(): HasMany
    {
        return $this->hasMany(WorkEntryPin::class)->orderBy('position');
    }

    protected static function newFactory(): WorkFactory
    {
        return WorkFactory::new();
    }

    /**
     * Mirror of Entry::generateUniqueSlug, scoped to (project_id).
     */
    private static function generateUniqueSlug(string $title, int $projectId, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()
            ->where('project_id', $projectId)
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = "$base-$suffix";
            $suffix++;
        }

        return $slug;
    }
}
