<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\BlueprintViewFactory;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $blueprint_id
 * @property int|null $user_id
 * @property string $name
 * @property string $type
 * @property array<string, mixed> $config
 * @property bool $is_default
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Blueprint $blueprint
 *
 * @method static BlueprintViewFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static BlueprintView create(array $attributes = [])
 */
class BlueprintView extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): BlueprintViewFactory
    {
        return BlueprintViewFactory::new();
    }

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function blueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    /**
     * Default table view configuration applied when no override is specified.
     *
     * @return array<string, mixed>
     */
    public static function defaultTableConfig(): array
    {
        return [
            'columns' => ['name', 'summary', 'status', 'updated_at'],
            'sortable_columns' => ['name', 'updated_at', 'created_at', 'sort_order'],
            'sort_field' => 'name',
            'sort_direction' => 'asc',
            'per_page' => 25,
        ];
    }
}
