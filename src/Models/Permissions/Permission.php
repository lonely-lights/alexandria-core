<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission as SpatiePermission;
use Spatie\Permission\Models\Role;

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
 *
 * @property int|null $category_id
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, SpatiePermission> $permissions
 * @property-read int|null $permissions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Role> $roles
 * @property-read int|null $roles_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $users
 * @property-read int|null $users_count
 *
 * @method static Builder<static>|Permission newModelQuery()
 * @method static Builder<static>|Permission newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Permission permission($permissions, $without = false)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Permission role($roles, $guard = null, $without = false)
 * @method static Builder<static>|Permission whereCategoryId($value)
 * @method static Builder<static>|Permission whereCreatedAt($value)
 * @method static Builder<static>|Permission whereDescription($value)
 * @method static Builder<static>|Permission whereGuardName($value)
 * @method static Builder<static>|Permission whereId($value)
 * @method static Builder<static>|Permission whereName($value)
 * @method static Builder<static>|Permission whereSortOrder($value)
 * @method static Builder<static>|Permission whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Permission withoutPermission($permissions)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Permission withoutRole($roles, $guard = null)
 *
 * @mixin \Eloquent
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
