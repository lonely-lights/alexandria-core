<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\BlueprintFactory;
use Alexandria\Core\Models\Framework\Project;
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
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Project $project
 * @property-read Collection<int, BlueprintField> $fields
 * @property-read Collection<int, Entry> $entries
 *
 * @method static Builder<static> standard()
 * @method static Builder<static> list()
 */
class Blueprint extends Model
{
    use HasFactory;
    use LogsActivity;
    use SoftDeletes;

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

    public function scopeStandard(Builder $query): Builder
    {
        return $query->where('classification', 'standard');
    }

    public function scopeList(Builder $query): Builder
    {
        return $query->where('classification', 'list');
    }
}
