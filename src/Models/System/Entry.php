<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Services\Entries\EntryHistoryService;
use Alexandria\Core\Traits\HasAlexandriaMedia;
use Alexandria\Core\Traits\Notable\HasNotes;
use Alexandria\Core\Traits\System\HasDynamicAttributes;
use Alexandria\Core\Traits\System\HasDynamicRelationships;
use BadMethodCallException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property int $project_id
 * @property int $blueprint_id
 * @property string $name
 * @property string $slug
 * @property string|null $summary
 * @property string|null $content
 * @property int $sort_order
 * @property int|null $parent_id
 * @property bool $is_stub
 * @property array<string, mixed>|null $metadata
 * @property array<string, mixed>|null $ai_notes
 * @property Carbon|null $archived_at
 * @property int|null $cascade_archived_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read Blueprint|null $type
 * @property-read static|null $parent
 * @property-read Collection<int, static> $children
 * @property-read Collection<int, FieldValue> $attributes
 * @property-read Collection<int, EntryRelationship> $childRelationships
 * @property-read Collection<int, EntryRelationship> $parentRelationships
 * @property-read Collection<int, Note> $notes
 * @property-read Collection<int, static> $mentionedEntries
 * @property-read Collection<int, static> $mentioningEntries
 * @property-read Collection<int, EntryHistory> $histories
 *
 * @method static Builder<static> active()
 * @method static Builder<static> archived()
 * @method static EntryFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Entry create(array $attributes = [])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static Builder<static> latest(string $column = 'created_at')
 */
class Entry extends Model implements HasMedia
{
    use HasAlexandriaMedia, InteractsWithMedia {
        HasAlexandriaMedia::registerMediaCollections insteadof InteractsWithMedia;
        HasAlexandriaMedia::registerMediaConversions insteadof InteractsWithMedia;
    }
    use HasDynamicAttributes;
    use HasDynamicRelationships;
    use HasFactory;
    use HasNotes;
    use LogsActivity;
    use SoftDeletes;

    protected $guarded = ['id'];

    /**
     * Process-level cache of native column listings keyed by table name.
     * `__set` consults this to decide whether an assigned key is a native
     * column (route to Eloquent) or a dynamic EAV field (route to the
     * trait). Without it, every __set fires a SHOW COLUMNS / PRAGMA
     * table_info query, compounding to N×fields queries on bulk saves.
     *
     * @var array<string, array<int, string>>
     */
    private static array $nativeColumnsCache = [];

    protected static function newFactory(): EntryFactory
    {
        return EntryFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'summary', 'content', 'sort_order', 'parent_id'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('project');
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'ai_notes' => 'array',
            'is_stub' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Entry $entry): void {
            // 0-based sort order. When no siblings exist, max() returns null;
            // null + 1 would silently produce 1, leaving 0 unused and clashing
            // with factories that default sort_order to 0. Coalesce to -1
            // first so the first auto-assigned entry in any sibling group is
            // 0, matching the factory default and Eloquent's column default.
            $entry->sort_order ??= (static::query()
                ->where('project_id', $entry->project_id)
                ->where('blueprint_id', $entry->blueprint_id)
                ->where('parent_id', $entry->parent_id)
                ->max('sort_order') ?? -1) + 1;

            if (empty($entry->slug) && ! empty($entry->name)) {
                $entry->slug = Str::slug($entry->name).'-'.Str::random(6);
            }
        });

        static::updating(function (Entry $entry): void {
            app(EntryHistoryService::class)->recordFieldChanges($entry);
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class, 'blueprint_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function attributes(): HasMany
    {
        // ORDER BY id keeps multi-value field order deterministic across reads.
        // Insertion order in HasDynamicAttributes::setDynamicAttribute is the
        // user's intent; relying on undefined SQL row order would be brittle.
        return $this->hasMany(FieldValue::class)->orderBy('id');
    }

    /**
     * Audit-trail records for this entry. Newest first; recordFieldChanges()
     * inserts a row per dirty trackable field on every update.
     */
    public function histories(): HasMany
    {
        return $this->hasMany(EntryHistory::class, 'entry_id')->latest();
    }

    /**
     * Entries that THIS entry mentions in its content (outgoing links).
     * Pivot's mention_count drives importance ranking — orderBy DESC so
     * heavily-referenced targets surface first.
     */
    public function mentionedEntries(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'entry_mentions', 'source_entry_id', 'target_entry_id')
            ->withPivot('mention_count')
            ->orderBy('mention_count', 'desc');
    }

    /**
     * Entries that mention THIS entry in their content (incoming links).
     */
    public function mentioningEntries(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'entry_mentions', 'target_entry_id', 'source_entry_id')
            ->withPivot('mention_count')
            ->orderBy('mention_count', 'desc');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->whereNotNull('archived_at');
    }

    /**
     * Magic getter that resolves attributes through the EAV chain:
     * 1. Native column / accessor on this model
     * 2. Defined Eloquent relationship method
     * 3. Foreign key column (_id suffix)
     * 4. Dynamic EAV field via the blueprint's field definitions
     * 5. Fall through to parent (which throws "Undefined property")
     */
    public function __get($key)
    {
        // 1. Native attribute or accessor.
        // Use getAttributes() (the raw attribute array accessor) rather than
        // the magic property $this->attributes -- the latter shadows
        // Eloquent's raw attribute storage with the EAV `attributes` HasMany
        // relation, so static type-checkers see a Collection, not an array.
        if (array_key_exists($key, $this->getAttributes()) || $this->hasGetMutator($key)) {
            return parent::__get($key);
        }

        // 2. Defined relationship method.
        if (method_exists($this, $key)) {
            return parent::__get($key);
        }

        // 3. Foreign key columns are always Eloquent's job.
        if (str_ends_with($key, '_id')) {
            return parent::__get($key);
        }

        // 4. EAV: look up the blueprint's field definitions.
        $this->loadMissing('type.fields');
        if ($this->type?->fields->contains('name', $key)) {
            return $this->getDynamicAttribute($key);
        }

        // 5. Default Eloquent behavior (will throw for invalid keys).
        return parent::__get($key);
    }

    /**
     * Magic setter that routes native columns through Eloquent and
     * everything else through the EAV setter.
     *
     * @throws RuntimeException when the key isn't a known native column AND
     *                          the blueprint has no field with that name
     * @throws ValidationException when an EAV field
     *                             value fails the field's
     *                             validation rules
     */
    public function __set($key, $value)
    {
        if ($this->isNativeColumn($key)
            || $this->hasSetMutator($key)
            || $this->hasAttributeSetMutator($key)
        ) {
            parent::__set($key, $value);

            return;
        }

        $this->setDynamicAttribute($key, $value);
    }

    /**
     * Return true if `$key` is a native column on this model's table.
     * Caches the column listing per process so __set doesn't fire a
     * schema-introspection query on every assignment.
     */
    private function isNativeColumn(string $key): bool
    {
        $table = $this->getTable();

        if (! isset(self::$nativeColumnsCache[$table])) {
            self::$nativeColumnsCache[$table] = $this->getConnection()
                ->getSchemaBuilder()
                ->getColumnListing($table);
        }

        return in_array($key, self::$nativeColumnsCache[$table], true);
    }

    /**
     * Magic method to handle calls to undefined methods.
     *
     * The entry point for accessing dynamic relationships as methods,
     * e.g. $entry->characters() or $entry->parentScenes(). The parent
     * Eloquent __call handles defined relationships, scopes, and
     * macros. If it throws BadMethodCallException, we route to the
     * HasDynamicRelationships trait's callDynamicRelationship.
     *
     * Edge case: if a defined scope's body itself raises
     * BadMethodCallException for a domain reason (e.g. calls a helper
     * that doesn't exist), the catch here will silently route to
     * callDynamicRelationship and the developer will see an empty
     * Builder result instead of an error. PHP fatal Errors propagate
     * normally because we don't catch Error / Throwable. If you add
     * scopes or macros and start seeing surprising empty results,
     * check whether they're throwing BadMethodCallException.
     */
    public function __call($method, $parameters)
    {
        try {
            return parent::__call($method, $parameters);
        } catch (BadMethodCallException) {
            return $this->callDynamicRelationship($method, $parameters);
        }
    }
}
