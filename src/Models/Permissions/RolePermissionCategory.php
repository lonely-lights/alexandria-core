<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Grouping vocabulary used by the admin UI when listing roles +
 * permissions. The `type` column discriminates whether a category
 * belongs to roles ("System", "Moderation", "Membership") or to
 * permissions ("User Management", "AI", "Privacy", …).
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $type
 * @property string|null $description
 * @property int $sort
 * @property string|null $icon
 * @property array|null $style
 *
 * @method static RolePermissionCategory create(array $attributes = [])
 * @method static RolePermissionCategory firstOrCreate(array $attributes, array $values = [])
 * @method static Builder<RolePermissionCategory> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<RolePermissionCategory> query()
 */
class RolePermissionCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'type',
        'description',
        'sort',
        'icon',
        'style',
    ];

    protected $casts = [
        'sort' => 'integer',
        'style' => 'array',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class, 'category_id');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class, 'category_id');
    }

    /**
     * Scope to only role-typed categories.
     *
     * @param  Builder<RolePermissionCategory>  $query
     * @return Builder<RolePermissionCategory>
     */
    public function scopeRoles(Builder $query): Builder
    {
        return $query->where('type', 'role');
    }

    /**
     * Scope to only permission-typed categories.
     *
     * @param  Builder<RolePermissionCategory>  $query
     * @return Builder<RolePermissionCategory>
     */
    public function scopePermissions(Builder $query): Builder
    {
        return $query->where('type', 'permission');
    }
}
