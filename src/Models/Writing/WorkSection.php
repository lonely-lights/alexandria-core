<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\WorkSectionFactory;
use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * One node of a work's user-controlled tree — Stage 8g.1.
 *
 * Any node may hold prose (content, wiki markup or Fountain-style
 * text per effectiveFormat()); null content means a pure container.
 * Slugs are unique per WORK (not per parent) so /works/{project}/
 * {work}/{section} deep links survive tree reorganization.
 *
 * @property int $id
 * @property int $work_id
 * @property int|null $parent_id
 * @property int $position
 * @property string $title
 * @property string $slug
 * @property string|null $label
 * @property string|null $content
 * @property string|null $format
 * @property string|null $synopsis
 * @property string|null $status
 * @property string|null $beat_type
 * @property string|null $goal
 * @property string|null $conflict
 * @property string|null $stakes
 * @property string|null $mood
 * @property string|null $tone
 * @property string|null $timeline_position
 * @property string|null $int_ext
 * @property int|null $pov_entry_id
 * @property int|null $setting_entry_id
 * @property int $word_count
 * @property int|null $target_words
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Work $work
 * @property-read WorkSection|null $parent
 * @property-read Collection<int, WorkSection> $children
 * @property-read Entry|null $povEntry
 * @property-read Entry|null $settingEntry
 * @property-read Collection<int, WorkSectionEntryMention> $entryMentions
 *
 * @method static WorkSectionFactory factory($count = null, $state = [])
 */
class WorkSection extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::creating(function (self $section) {
            if (empty($section->slug) && ! empty($section->title)) {
                $section->slug = static::generateUniqueSlug($section->title, $section->work_id);
            }

            if ($section->getAttribute('position') === null) {
                $max = static::query()
                    ->where('work_id', $section->work_id)
                    ->where('parent_id', $section->parent_id)
                    ->max('position');

                $section->position = $max === null ? 0 : $max + 1;
            }
        });

        static::updating(function (self $section) {
            if ($section->isDirty('title') && ! $section->isDirty('slug')) {
                $section->slug = static::generateUniqueSlug($section->title, $section->work_id, $section->id);
            }
        });
    }

    public function work(): BelongsTo
    {
        return $this->belongsTo(Work::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position');
    }

    public function povEntry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'pov_entry_id');
    }

    public function settingEntry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'setting_entry_id');
    }

    public function entryMentions(): HasMany
    {
        return $this->hasMany(WorkSectionEntryMention::class);
    }

    /**
     * The format this section's content parses as: its own override,
     * else the work default.
     */
    public function effectiveFormat(): string
    {
        $this->loadMissing('work');

        return $this->format ?? $this->work->format;
    }

    protected static function newFactory(): WorkSectionFactory
    {
        return WorkSectionFactory::new();
    }

    /**
     * Mirror of Entry::generateUniqueSlug, scoped to (work_id) — NOT
     * parent_id, so deep links survive moves (spec decision).
     */
    private static function generateUniqueSlug(string $title, int $workId, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()
            ->where('work_id', $workId)
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
