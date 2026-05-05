<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * @property int $id
 * @property string $name
 * @property string|null $display_name
 * @property string|null $group
 * @property string|null $description
 * @property int|null $sort
 * @property string $guard_name
 * @property array|null $style
 * @property string|null $icon
 * @property array|null $icon_style
 * @property-read RolePermissionCategory|null $category
 *
 * @method static Permission create(array $attributes = [])
 * @method static Permission firstOrCreate(array $attributes, array $values = [])
 * @method static Builder<Permission> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<Permission> query()
 * @method static Collection pluck(string|Expression $column, string|null $key = null)
 */
class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'category_id',
        'description',
        'sort_order',
    ];

    public function getRouteKeyName(): string
    {
        return 'name';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(RolePermissionCategory::class, 'category_id');
    }
}
