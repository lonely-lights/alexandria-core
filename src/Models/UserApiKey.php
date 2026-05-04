<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\UserApiKeyFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Per-user, per-provider BYOK API key. Multiple keys per provider per
 * user; only one is_active at a time per user+provider pair (enforced
 * by activate()).
 *
 * @property int $id
 * @property int $user_id
 * @property int $ai_provider_id
 * @property string $label
 * @property string $api_key (encrypted)
 * @property string $api_key_last_four
 * @property Carbon|null $expires_at
 * @property bool $is_active
 * @property Carbon|null $last_used_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Model|null $user
 * @property-read AiProvider $provider
 * @property-read bool $is_expired
 * @property-read string|null $expiration_status
 * @property-read string $last_used_status
 *
 * @method static Builder<static> active()
 * @method static Builder<static> valid()
 * @method static Builder<static> forProvider(int $providerId)
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static UserApiKey|null find(mixed $id, array $columns = ['*'])
 * @method static UserApiKey findOrFail(mixed $id, array $columns = ['*'])
 * @method static UserApiKeyFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static UserApiKey create(array $attributes = [])
 */
class UserApiKey extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): UserApiKeyFactory
    {
        return UserApiKeyFactory::new();
    }

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'expires_at' => 'date',
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function getIsExpiredAttribute(): bool
    {
        if (! $this->expires_at) {
            return false;
        }

        // The host app's User may expose a `timezone` attribute. Default
        // to UTC if the user model has no timezone or the relation is
        // unloaded -- we don't lift the User model in core.
        $userTimezone = $this->user?->timezone ?? 'UTC';
        $expiresAt = Carbon::parse($this->expires_at)->endOfDay()->timezone($userTimezone);

        return Carbon::now($userTimezone)->isAfter($expiresAt);
    }

    public function isValid(): bool
    {
        return ! $this->is_expired;
    }

    public function getExpirationStatusAttribute(): ?string
    {
        if (! $this->expires_at) {
            return __('Never expires');
        }
        if ($this->is_expired) {
            return __('Expired');
        }
        $daysUntil = (int) Carbon::today()->diffInDays($this->expires_at->startOfDay());
        if ($daysUntil === 0) {
            return __('Expires today');
        }
        if ($daysUntil === 1) {
            return __('Expires tomorrow');
        }
        if ($daysUntil <= 7) {
            return __('Expires in :days days', ['days' => $daysUntil]);
        }

        return __('Expires :date', ['date' => $this->expires_at->format('M j, Y')]);
    }

    public function getLastUsedStatusAttribute(): string
    {
        return $this->last_used_at
            ? __('Used :time', ['time' => $this->last_used_at->diffForHumans()])
            : __('Never used');
    }

    public function markAsUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }

    public function activate(): void
    {
        // Deactivate other keys for this user+provider.
        static::query()
            ->where('user_id', $this->user_id)
            ->where('ai_provider_id', $this->ai_provider_id)
            ->where('id', '!=', $this->id)
            ->update(['is_active' => false]);

        $this->update(['is_active' => true]);

        // Update the user's AI settings to point at this key. The host
        // app's User must expose an aiSetting HasOne for this to fire.
        $this->user?->aiSetting?->update(['active_api_key_id' => $this->id]);
    }

    public function deactivate(): void
    {
        $this->update(['is_active' => false]);

        if ($this->user?->aiSetting?->active_api_key_id === $this->id) {
            $this->user->aiSetting->update(['active_api_key_id' => null]);
        }
    }

    public static function generateSuggestedLabel(AiProvider $provider, ?string $purpose = null): string
    {
        $parts = [];
        if ($purpose) {
            $parts[] = $purpose;
        }
        $parts[] = $provider->name;
        $parts[] = now()->format('M Y');

        return implode(' - ', $parts);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        });
    }

    public function scopeForProvider(Builder $query, int $providerId): Builder
    {
        return $query->where('ai_provider_id', $providerId);
    }
}
