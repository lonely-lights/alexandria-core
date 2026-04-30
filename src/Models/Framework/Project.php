<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Framework;

use Alexandria\Core\Database\Factories\Framework\ProjectFactory;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Traits\HasAlexandriaMedia;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property bool $use_subdomain
 * @property int|null $owner_id
 * @property int|null $creator_id
 * @property string|null $logline
 * @property string|null $summary
 * @property string|null $contents
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Model|null $owner
 * @property-read Model|null $creator
 * @property-read Collection<int, Blueprint> $blueprints
 * @property-read Collection<int, Entry> $entries
 */
class Project extends Model implements HasMedia
{
    use HasAlexandriaMedia, InteractsWithMedia {
        HasAlexandriaMedia::registerMediaCollections insteadof InteractsWithMedia;
        HasAlexandriaMedia::registerMediaConversions insteadof InteractsWithMedia;
    }
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): ProjectFactory
    {
        return ProjectFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'use_subdomain' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'owner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'creator_id');
    }

    public function blueprints(): HasMany
    {
        return $this->hasMany(Blueprint::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }
}
