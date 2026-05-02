<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Framework;

use Alexandria\Core\Database\Factories\Framework\ProjectFactory;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\ProjectAiInstruction;
use Alexandria\Core\Models\ProjectAiSetting;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Traits\AI\HasEavAiIntegration;
use Alexandria\Core\Traits\HasAlexandriaMedia;
use Alexandria\Core\Traits\Notable\HasNotes;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
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
 * @property-read Collection<int, Note> $notes
 * @property-read ProjectAiSetting|null $aiSettings
 * @property-read Collection<int, ProjectAiInstruction> $aiInstructions
 * @property-read Collection<int, Model> $users
 *
 * @method static ProjectFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Project create(array $attributes = [])
 */
class Project extends Model implements HasMedia
{
    use HasAlexandriaMedia, InteractsWithMedia {
        HasAlexandriaMedia::registerMediaCollections insteadof InteractsWithMedia;
        HasAlexandriaMedia::registerMediaConversions insteadof InteractsWithMedia;
    }
    use HasEavAiIntegration;
    use HasFactory;
    use HasNotes;
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

    public function aiSettings(): HasOne
    {
        return $this->hasOne(ProjectAiSetting::class);
    }

    public function aiInstructions(): HasMany
    {
        return $this->hasMany(ProjectAiInstruction::class);
    }

    /**
     * Project members. The pivot stores (user_id, role_id) so a user
     * can hold multiple roles per project — pivot rows are NOT unique
     * on (project_id, user_id) alone. Resolve the User class through
     * config per ADR-006.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            config('alexandria.models.user'),
            'project_user',
            'project_id',
            'user_id',
        )->withPivot('role_id')->withTimestamps();
    }
}
