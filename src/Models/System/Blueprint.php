<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\BlueprintFactory;
use Alexandria\Core\Models\AiConfiguration;
use Alexandria\Core\Models\BlueprintView;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Traits\AI\HasAiInstructions;
use Alexandria\Core\Traits\HasAiConfiguration;
use Alexandria\Core\Traits\HasAlexandriaMedia;
use Alexandria\Core\Traits\Notable\HasNotes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property int $project_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string|null $icon
 * @property bool $show_on_dashboard
 * @property bool $is_linkable
 * @property bool $is_hub
 * @property string $classification
 * @property string $list_selection_mode
 * @property array<string, mixed>|null $infobox_schema
 * @property string $content_renderer
 * @property array<string, mixed>|null $metadata
 * @property bool $show_tree_view
 * @property bool $enable_timeline
 * @property array<int, array<string, mixed>>|null $views
 * @property string|null $ai_prompt_instructions
 * @property bool $allow_ai_sorting
 * @property string|null $theme_preset_slug
 * @property array<string, mixed>|null $theme_override
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read Collection<int, BlueprintField> $fields
 * @property-read Collection<int, Entry> $entries
 * @property-read Collection<int, Note> $notes
 * @property-read Collection<int, BlueprintView> $blueprintViews
 * @property-read Collection<int, AiConfiguration> $aiConfigurations
 * @property-read int|null $entries_count Loaded by withCount('entries')
 * @property-read int|null $fields_count Loaded by withCount('fields')
 *
 * @method static Builder<static> standard()
 * @method static Builder<static> list()
 * @method static BlueprintFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Blueprint create(array $attributes = [])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static Blueprint findOrFail(mixed $id, array|string $columns = ['*'])
 * @method static Blueprint|null find(mixed $id, array|string $columns = ['*'])
 */
class Blueprint extends Model implements HasMedia
{
    use HasAiConfiguration;
    use HasAiInstructions {
        // HasAiConfiguration already defines getAiInstructions(string $type).
        // Keep that version as the primary; alias the no-arg version for direct use.
        HasAiConfiguration::getAiInstructions insteadof HasAiInstructions;
        HasAiInstructions::getAiInstructions as getPromptInstructions;
    }
    use HasAlexandriaMedia, InteractsWithMedia {
        HasAlexandriaMedia::registerMediaCollections insteadof InteractsWithMedia;
        HasAlexandriaMedia::registerMediaConversions insteadof InteractsWithMedia;
    }
    use HasFactory;
    use HasNotes;
    use LogsActivity;
    use SoftDeletes;

    public const string CLASSIFICATION_STANDARD = 'standard';

    public const string CLASSIFICATION_LIST = 'list';

    public const string CLASSIFICATION_STRUCTURAL = 'structural';

    public const string CLASSIFICATION_RELATIONSHIP = 'relationship';

    protected $guarded = ['id'];

    protected static function newFactory(): BlueprintFactory
    {
        return BlueprintFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'description', 'icon', 'classification', 'show_on_dashboard'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('project');
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'views' => 'array',
            'infobox_schema' => 'array',
            'theme_override' => 'array',
            'show_on_dashboard' => 'boolean',
            'is_linkable' => 'boolean',
            'is_hub' => 'boolean',
            'show_tree_view' => 'boolean',
            'enable_timeline' => 'boolean',
            'allow_ai_sorting' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(BlueprintField::class)->orderBy('sort_order');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(Entry::class);
    }

    public function blueprintViews(): HasMany
    {
        return $this->hasMany(BlueprintView::class);
    }

    public function scopeStandard(Builder $query): Builder
    {
        return $query->where('classification', self::CLASSIFICATION_STANDARD);
    }

    public function scopeList(Builder $query): Builder
    {
        return $query->where('classification', self::CLASSIFICATION_LIST);
    }
}
