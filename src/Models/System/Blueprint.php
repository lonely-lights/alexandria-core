<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\BlueprintFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Blueprint extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): BlueprintFactory
    {
        return BlueprintFactory::new();
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
