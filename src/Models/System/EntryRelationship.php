<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryRelationshipFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Entry Relationship Model — Bidirectional Single-Row Storage
 *
 * Each relationship is stored once with labels for both sides.
 * parent_label is shown on the CHILD's page (describes the parent).
 * child_label  is shown on the PARENT's page (describes the child).
 * relationship_type is a slug joining to a RelationshipBlueprint or Blueprint.
 *
 * NO unique constraint -- multiple rows of the same type between the same
 * pair are intentional (different periods, contexts, subtypes).
 *
 * @property int $id
 * @property int $parent_entry_id
 * @property int $child_entry_id
 * @property string $relationship_type
 * @property string|null $parent_label
 * @property string|null $child_label
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $archived_at
 * @property int|null $cascade_archived_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Entry $parent
 * @property-read Entry $child
 * @property-read Blueprint $blueprint
 *
 * @method static Builder<static> ofType(string $typeSlug)
 * @method static Builder<static> active()
 * @method static Builder<static> archived()
 */
class EntryRelationship extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): EntryRelationshipFactory
    {
        return EntryRelationshipFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'archived_at' => 'datetime',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'parent_entry_id');
    }

    public function child(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'child_entry_id');
    }

    /**
     * The blueprint that defines the schema for this relationship's metadata.
     * Joins relationship_type to Blueprint's slug.
     */
    public function blueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class, 'relationship_type', 'slug');
    }

    public function scopeOfType(Builder $query, string $typeSlug): Builder
    {
        return $query->where('relationship_type', $typeSlug);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->whereNotNull('archived_at');
    }

    public function archive(): void
    {
        $this->update(['archived_at' => now()]);
    }

    public function unarchive(): void
    {
        $this->update(['archived_at' => null]);
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
