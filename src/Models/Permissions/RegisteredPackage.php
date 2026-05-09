<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One row per package that has registered permissions through
 * `AppPermissionRegistry::register()`. The slug is the primary key
 * and matches `permissions.package_slug` for the join.
 *
 * `last_registered_at` bumps every time the package's service
 * provider boots and re-runs the registry (idempotent), so the admin
 * grid can show "last seen" / "stale" indicators if a package gets
 * removed from the install.
 *
 * @property string $slug
 * @property string $name
 * @property string|null $version
 * @property CarbonImmutable|null $last_registered_at
 *
 * @method static RegisteredPackage create(array $attributes = [])
 * @method static RegisteredPackage firstOrCreate(array $attributes, array $values = [])
 * @method static RegisteredPackage updateOrCreate(array $attributes, array $values = [])
 * @method static Builder<RegisteredPackage> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<RegisteredPackage> query()
 */
class RegisteredPackage extends Model
{
    protected $table = 'registered_packages';

    protected $primaryKey = 'slug';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'slug',
        'name',
        'version',
        'last_registered_at',
    ];

    protected $casts = [
        'last_registered_at' => 'immutable_datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class, 'package_slug', 'slug');
    }
}
