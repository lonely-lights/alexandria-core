<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\UserAiPromptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Per-user custom prompts (quick-actions). Stored verbatim by user
 * since each user can have their own personal prompt library.
 *
 * @property int $id
 * @property int $user_id
 * @property string $label
 * @property string $prompt
 * @property string $action
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Model|null $user
 *
 * @method static UserAiPromptFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static UserAiPrompt create(array $attributes = [])
 */
class UserAiPrompt extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): UserAiPromptFactory
    {
        return UserAiPromptFactory::new();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }
}
