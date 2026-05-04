<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Framework;

use Alexandria\Core\Database\Factories\Framework\ProjectFactory;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\ProjectAiInstruction;
use Alexandria\Core\Models\ProjectAiSetting;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Traits\AI\HasEavAiIntegration;
use Alexandria\Core\Traits\HasAlexandriaMedia;
use Alexandria\Core\Traits\Notable\HasNotes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\Tags\HasTags;

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
 * @property-read Collection<int, AiTransaction> $aiTransactions
 * @property-read Collection<int, Model> $users
 * @property-read string|null $page_image_url
 * @property-read string|null $page_image_thumb_url
 * @property-read string|null $banner_desktop_url
 * @property-read int|null $entries_count Loaded by withCount('entries')
 * @property-read int|null $users_count Loaded by withCount('users')
 * @property-read int|null $blueprints_count Loaded by withCount('blueprints')
 * @property-read int|null $notes_count Loaded by withCount('notes')
 *
 * @method static ProjectFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Project create(array $attributes = [])
 * @method static Project|null find($id, $columns = ['*'])
 * @method static Project findOrFail($id, $columns = ['*'])
 * @method static Project firstOrFail($columns = ['*'])
 * @method static Project|null first($columns = ['*'])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
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
    use HasTags;
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

    /**
     * Auto-generate slug from name on create when none was supplied.
     * Lighter equivalent of legacy's spatie/laravel-sluggable HasSlug
     * trait — same intent ("no slug? generate from name"), no extra
     * package dependency.
     */
    protected static function booted(): void
    {
        static::creating(function (Project $project): void {
            if (empty($project->slug) && ! empty($project->name)) {
                $project->slug = Str::slug($project->name);
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'owner_id');
    }

    /**
     * Project-wide toggle for cascading the project's media (page
     * image, banner) down to blueprints + entries that don't have
     * their own. Defaults true; consumers turn it off via
     * `metadata->inherit_media_downward = false` when each blueprint
     * brings its own art and the project's image shouldn't bleed
     * through the gaps.
     */
    public function inheritMediaDownward(): bool
    {
        return (bool) ($this->metadata['inherit_media_downward'] ?? true);
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
     * AI transactions logged against this project (text/image/audio
     * generations, embeddings, etc.). Used by the project dashboard's
     * "AI usage this month" badge and by the AI tab's history view.
     */
    public function aiTransactions(): HasMany
    {
        return $this->hasMany(AiTransaction::class);
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
