<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\FieldValueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $entry_id
 * @property int $blueprint_field_id
 * @property string|null $value
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Entry $entry
 * @property-read BlueprintField $blueprintField
 *
 * @method static FieldValueFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static FieldValue create(array $attributes = [])
 */
class FieldValue extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $touches = ['entry'];

    protected static function newFactory(): FieldValueFactory
    {
        return FieldValueFactory::new();
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function blueprintField(): BelongsTo
    {
        return $this->belongsTo(BlueprintField::class);
    }
}
