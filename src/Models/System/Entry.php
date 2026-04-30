<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Entry extends Model
{
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
}
