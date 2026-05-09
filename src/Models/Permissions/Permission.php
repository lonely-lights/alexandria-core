<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Permission as SpatiePermission;

/**
 * Permission wrapper — extends Spatie's Permission with the admin-
 * grid + registry metadata the framework needs.
 *
 * Stage 7a additions:
 *   - `display_name`  Human-readable label ("View Users").
 *   - `package_slug`  Which registered package brought this permission
 *                     into existence ("app", "saas", "craft", …).
 *
 * Stage 7a relies on the existing `description`, `category_id`, and
 * `sort_order` columns from the earlier
 * `0001_01_01_000110_create_permission_tables` migration.
 *
 * `display_name` falls back to a Title-cased `name` slug via the
 * accessor so consumers that haven't filled it in still get a
 * readable label.
 *
 * @property int $id
 * @property string $name
 * @property string $guard_name
 * @property string|null $display_name
 * @property string|null $package_slug
 * @property string|null $description
 * @property int|null $category_id
 * @property int $sort_order
 * @property-read RolePermissionCategory|null $category
 * @property-read RegisteredPackage|null $package
 *
 * @method static Permission create(array $attributes = [])
 * @method static Permission firstOrCreate(array $attributes, array $values = [])
 * @method static Permission updateOrCreate(array $attributes, array $values = [])
 * @method static Builder<Permission> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<Permission> query()
 */
class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'package_slug',
        'category_id',
        'description',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'name';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(RolePermissionCategory::class, 'category_id');
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(RegisteredPackage::class, 'package_slug', 'slug');
    }

    /**
     * Display label, falling back to a Title-cased `name` slug when no
     * explicit `display_name` is set. `'app-users-view' → 'App Users View'`.
     */
    public function getDisplayLabelAttribute(): string
    {
        return $this->display_name
            ?? ucwords(str_replace(['-', '_'], ' ', (string) $this->name));
    }
}
