<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * Permission Model
 *
 * Represents a permission in the application's authorization system.
 *
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
 * @method static \Illuminate\Support\Collection pluck(string|\Illuminate\Contracts\Database\Query\Expression $column, string|null $key = null)
 */
class Permission extends SpatiePermission
{
    // Use

    // ##########################################################
    // Model Configuration
    // ##########################################################

    // Route Key Name
    public function getRouteKeyName(): string
    {
        return 'name';
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'guard_name',
        'category_id',
        'description',
        'sort_order',
    ];

    /**
     * Boot the model.
     */
    protected static function boot(): void
    {
        parent::boot();

    }

    // ##########################################################
    // Relationships
    // ##########################################################

    public function category(): BelongsTo
    {
        return $this->belongsTo(RolePermissionCategory::class, 'category_id');
    }
}
