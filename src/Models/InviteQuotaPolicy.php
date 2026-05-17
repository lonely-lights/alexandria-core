<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Models\Permissions\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Per-role invite quota policy — Stage 8c.E.1.
 *
 * One row per app-level role. The `mode` column drives which
 * other columns are meaningful:
 *
 *   - `unlimited`: bypass quota entirely; initial_invites + all
 *     replenish_* are NULL
 *   - `one_time`: grant `initial_invites` at account creation, no
 *     replenishment; replenish_* are NULL
 *   - `scheduled`: grant `initial_invites` at account creation +
 *     `replenish_amount` every `replenish_interval_days`, capped at
 *     `replenish_cap` (null = uncapped within mode)
 *
 * The InviteQuotaService (Stage 8c.E.2) consumes these rows; this
 * model is just the data shape + admin CRUD target.
 *
 * @property int $id
 * @property int $role_id
 * @property string $mode
 * @property int|null $initial_invites
 * @property int|null $replenish_amount
 * @property int|null $replenish_interval_days
 * @property int|null $replenish_cap
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Role $role
 */
class InviteQuotaPolicy extends Model
{
    protected $table = 'invite_quota_policies';

    protected $fillable = [
        'role_id',
        'mode',
        'initial_invites',
        'replenish_amount',
        'replenish_interval_days',
        'replenish_cap',
    ];

    protected $casts = [
        'initial_invites' => 'integer',
        'replenish_amount' => 'integer',
        'replenish_interval_days' => 'integer',
        'replenish_cap' => 'integer',
    ];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
