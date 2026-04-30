<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\UserAiSettingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Per-user AI configuration. Holds default model selections + the
 * pointer to the active API key per user. Legacy api_key fields
 * remain for backwards compat but new keys live in UserApiKey.
 *
 * @property int $id
 * @property int $user_id
 * @property int $ai_provider_id
 * @property int|null $active_api_key_id
 * @property string|null $analyst_model_name
 * @property string|null $creative_model_name
 * @property string|null $image_model_name
 * @property string|null $video_model_name
 * @property string|null $api_key (encrypted, legacy)
 * @property string|null $api_key_last_four (legacy)
 * @property Carbon|null $api_key_expires_at (legacy)
 * @property Carbon|null $api_key_created_at (legacy)
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Model|null $user
 * @property-read AiProvider $provider
 * @property-read UserApiKey|null $activeApiKey
 */
class UserAiSetting extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): UserAiSettingFactory
    {
        return UserAiSettingFactory::new();
    }

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted', // Legacy
            'api_key_expires_at' => 'date',
            'api_key_created_at' => 'datetime',
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

    public function activeApiKey(): BelongsTo
    {
        return $this->belongsTo(UserApiKey::class, 'active_api_key_id');
    }

    public function hasValidKey(): bool
    {
        if ($this->activeApiKey && $this->activeApiKey->isValid()) {
            return true;
        }

        return ! empty($this->api_key) && ! $this->isLegacyKeyExpired();
    }

    public function getDecryptedApiKey(): ?string
    {
        if ($this->activeApiKey && $this->activeApiKey->isValid()) {
            return $this->activeApiKey->api_key;
        }

        if (! empty($this->api_key) && ! $this->isLegacyKeyExpired()) {
            return $this->api_key;
        }

        return null;
    }

    public function isLegacyKeyExpired(): bool
    {
        if (! $this->api_key_expires_at) {
            return false;
        }

        return now()->isAfter($this->api_key_expires_at->endOfDay());
    }

    /**
     * @deprecated Use UserApiKey model for key management.
     */
    public function clearLegacyApiKey(): void
    {
        $this->update([
            'api_key' => null,
            'api_key_last_four' => null,
            'api_key_expires_at' => null,
            'api_key_created_at' => null,
        ]);
    }
}
