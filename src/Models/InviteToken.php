<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;

/**
 * Single- or multi-use registration token — Stage 8c.E.4.
 *
 * Consumed by InviteTokenService::consume() during /register POST
 * when instance_settings.open_registration is off. State machine:
 *
 *   - usable: uses_count < max_uses AND (expires_at is null OR expires_at > now())
 *   - exhausted: uses_count >= max_uses
 *   - expired: expires_at <= now()
 *
 * No soft-deletes — operators "revoke" by either setting expires_at
 * to now() or hard-deleting the row.
 *
 * @property int $id
 * @property string $code
 * @property int $max_uses
 * @property int $uses_count
 * @property Carbon|null $expires_at
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Authenticatable|null $creator
 */
class InviteToken extends Model
{
    protected $table = 'invite_tokens';

    protected $fillable = [
        'code',
        'max_uses',
        'uses_count',
        'expires_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'max_uses' => 'integer',
        'uses_count' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            config('auth.providers.users.model', Authenticatable::class),
            'created_by',
        );
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isExhausted(): bool
    {
        return $this->uses_count >= $this->max_uses;
    }

    public function isUsable(): bool
    {
        return ! $this->isExpired() && ! $this->isExhausted();
    }
}
