<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\BlueprintFieldFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BlueprintField extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $touches = ['blueprint'];

    protected static function newFactory(): BlueprintFieldFactory
    {
        return BlueprintFieldFactory::new();
    }

    protected function casts(): array
    {
        return [
            'validation_rules' => 'array',
            'is_required' => 'boolean',
        ];
    }

    public function blueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class);
    }

    protected function targetBlueprintSlug(): Attribute
    {
        return Attribute::get(fn () => $this->validation_rules['target_blueprint_slug'] ?? null);
    }

    /**
     * Type fields classify entries (e.g. location_type, event_type) and are
     * displayed prominently in infoboxes and used for AI categorization.
     * Only `entry_reference` fields can be type fields -- text/integer/etc
     * fields with `is_type_field=true` in validation_rules are ignored.
     */
    protected function isTypeField(): Attribute
    {
        return Attribute::get(fn () => $this->type === 'entry_reference'
            && (bool) ($this->validation_rules['is_type_field'] ?? false));
    }
}
