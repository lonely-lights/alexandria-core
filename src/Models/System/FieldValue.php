<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\FieldValueFactory;
use Illuminate\Database\Eloquent\Builder;
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
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static FieldValue|null find(mixed $id, array|string $columns = ['*'])
 * @method static FieldValue findOrFail(mixed $id, array|string $columns = ['*'])
 * @method static Builder<static>|FieldValue newModelQuery()
 * @method static Builder<static>|FieldValue newQuery()
 * @method static Builder<static>|FieldValue whereBlueprintFieldId($value)
 * @method static Builder<static>|FieldValue whereCreatedAt($value)
 * @method static Builder<static>|FieldValue whereEntryId($value)
 * @method static Builder<static>|FieldValue whereId($value)
 * @method static Builder<static>|FieldValue whereUpdatedAt($value)
 * @method static Builder<static>|FieldValue whereValue($value)
 *
 * @mixin \Eloquent
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
