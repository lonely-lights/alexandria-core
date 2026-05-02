<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Database\Eloquent\Builder;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Role wrapper — extends Spatie's Role so PhpStorm sees the
 * Eloquent-static methods through our typed @method annotations
 * (Spatie's class doesn't carry them).
 *
 * @property int $id
 * @property string $name
 * @property string $guard_name
 * @property string|null $description
 *
 * @method static Role create(array $attributes = [])
 * @method static Role firstOrCreate(array $attributes, array $values = [])
 * @method static Builder<Role> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<Role> query()
 * @method void syncPermissions(mixed $permissions)
 * @method void givePermissionTo(mixed $permissions)
 */
class Role extends SpatieRole
{
    public function getRouteKeyName(): string
    {
        return 'name';
    }

    protected $fillable = [
        'name',
        'guard_name',
        'project_id',
    ];
}
