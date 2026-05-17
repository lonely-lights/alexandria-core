<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Permissions\Permission;
use Alexandria\Core\Models\Permissions\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Admin-defined cohort — Stage 8c.E.3.
 *
 * A list captures intent beyond "this person is on the project":
 * "Spring 2026 Workshop", "Beta Cohort", "Editorial Team". Lists
 * can grant capabilities through three composable mechanisms:
 *
 *   1. `auto_role_id` — a role auto-assigned when user is added
 *   2. `permissions()` — explicit permission grants beyond role
 *   3. `featureFlags()` — feature gates ("Beta Cohort UI")
 *
 * Scope: 'instance' (admin-managed, no project_id) or 'project'
 * (owned by a project's operator, project_id set). Spatie's
 * project-teams concept stays parallel per the design Q2 → C
 * decision; lists are an additional layer, not a replacement.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $scope
 * @property int|null $owner_id
 * @property int|null $project_id
 * @property int|null $auto_role_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project|null $project
 * @property-read Role|null $autoRole
 */
class InviteList extends Model
{
    protected $table = 'invite_lists';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'scope',
        'owner_id',
        'project_id',
        'auto_role_id',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function autoRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'auto_role_id');
    }

    /**
     * Members of this list. Pivot carries `added_by` + `added_at`
     * for audit. Use the InviteListService for add/remove so
     * auto-role + permission grants get applied/revoked.
     */
    public function users(): BelongsToMany
    {
        // Resolve the consumer's User model via auth config so core
        // stays decoupled from App\Models\User. Authenticatable in
        // the typehint is just for IDE/static-analysis; runtime
        // returns instances of whatever auth provider the host app
        // configured.
        return $this->belongsToMany(
            config('auth.providers.users.model', Authenticatable::class),
            'invite_list_user',
            'list_id',
            'user_id',
        )
            ->withPivot(['added_by', 'added_at'])
            ->withTimestamps();
    }

    /**
     * Explicit per-list permission grants. Layered on top of any
     * permissions the user's base role provides. Resolved at
     * authz time by the Gate::before hook registered in
     * AppServiceProvider.
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'invite_list_permissions',
            'list_id',
            'permission_id',
        )->withTimestamps();
    }

    /**
     * Feature gate keys this list enables. Free-form strings —
     * consumer code checks `app(FeatureGateService::class)
     * ->isActiveForUser($user, $key)` which walks the user's
     * lists. The FeatureGateService lands when the first feature
     * gate actually ships.
     *
     * @return array<int, string>
     */
    public function featureFlagKeys(): array
    {
        return DB::table('invite_list_feature_flags')
            ->where('list_id', $this->id)
            ->pluck('feature_key')
            ->all();
    }
}
