<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * RolePermissionCategory — grouping vocabulary used by the admin
 * UI when listing roles and permissions.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $type
 *
 * @method static RolePermissionCategory create(array $attributes = [])
 * @method static Builder<RolePermissionCategory> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<RolePermissionCategory> query()
 */
class RolePermissionCategory extends Model
{
    // ##########################################################
    // Model Attribute Configuration
    // ##########################################################

    // Change URL to Slug
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    // Data Mapping
    public string $modelDescription = 'This is a grouping used for roles and permissions.';

    // Columns
    protected $fillable = [
        'name',
        'slug',
        'type',
    ];

    // ##########################################################
    // Relationships
    // ##########################################################

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class, 'category_id');
    }
}
