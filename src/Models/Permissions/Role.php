<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Permissions;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Role wrapper — extends Spatie's Role with the admin-grid metadata
 * the framework's UI surfaces depend on (display_name, description,
 * style + icon, rank for sort/hierarchy).
 *
 * The slug-shaped `name` column stays the durable lookup key (passed
 * to `assignRole('owner')`); the new columns are presentation-only.
 *
 * `display_name` falls back to a Title-cased `name` via the accessor
 * so consumers that haven't filled it in still get a readable label.
 *
 * @property int $id
 * @property string $name
 * @property string $guard_name
 * @property string|null $display_name
 * @property string|null $description
 * @property array|null $style
 * @property string|null $icon
 * @property int|null $rank
 * @property int|null $category_id
 * @property int|null $team_id
 * @property bool $is_project_template
 * @property-read RolePermissionCategory|null $category
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
    protected $fillable = [
        'name',
        'guard_name',
        'project_id',
        'category_id',
        'display_name',
        'description',
        'style',
        'icon',
        'rank',
        'is_project_template',
    ];

    protected $casts = [
        'style' => 'array',
        'rank' => 'integer',
        'is_project_template' => 'boolean',
    ];

    public function getRouteKeyName(): string
    {
        return 'name';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(RolePermissionCategory::class, 'category_id');
    }

    /**
     * Display label, falling back to a Title-cased `name` slug when no
     * explicit `display_name` is set. `'super-moderator' → 'Super Moderator'`.
     */
    public function getDisplayLabelAttribute(): string
    {
        return $this->display_name
            ?? ucwords(str_replace(['-', '_'], ' ', (string) $this->name));
    }
}
