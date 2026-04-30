<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryFactory;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Traits\System\HasDynamicAttributes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Entry extends Model
{
    use HasDynamicAttributes;
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): EntryFactory
    {
        return EntryFactory::new();
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
        return $this->hasMany(FieldValue::class);
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
        if (array_key_exists($key, $this->attributes) || $this->hasGetMutator($key)) {
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
     * @throws \Exception when the key isn't a known native column AND
     *                    the blueprint has no field with that name
     */
    public function __set($key, $value)
    {
        if ($this->getConnection()->getSchemaBuilder()->hasColumn($this->getTable(), $key) || $this->hasSetMutator($key)) {
            parent::__set($key, $value);

            return;
        }

        $this->setDynamicAttribute($key, $value);
    }
}
