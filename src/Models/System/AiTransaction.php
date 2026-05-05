<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\AiTransactionFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User;
use Illuminate\Support\Carbon;

/**
 * AiTransaction Model
 *
 * Represents a transaction for AI services, including token usage and cost.
 * The `source` column attributes the credential origin for BYOK accounting:
 * 'env' (operator-provided keys) or 'user' (bring-your-own-key).
 *
 * @property int $id
 * @property int|null $user_id
 * @property int|null $project_id
 * @property string|null $batch_id
 * @property string $provider_name
 * @property string $model_name
 * @property string $source
 * @property string|null $context
 * @property int $input_tokens
 * @property int $output_tokens
 * @property int $thinking_tokens
 * @property int $cache_read_tokens
 * @property int $cache_write_tokens
 * @property int $total_tokens
 * @property string $cost
 * @property int|null $latency_ms
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $user
 * @property-read Project|null $project
 *
 * @method static AiTransactionFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static AiTransaction create(array $attributes = [])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static Builder<static> whereMonth(string $column, mixed $value, string $boolean = 'and')
 * @method static Builder<static> whereYear(string $column, mixed $value, string $boolean = 'and')
 */
class AiTransaction extends Model
{
    use HasFactory;

    protected $table = 'ai_transactions';

    protected $guarded = ['id'];

    protected static function newFactory(): AiTransactionFactory
    {
        return AiTransactionFactory::new();
    }

    protected function casts(): array
    {
        return [
            'input_tokens' => 'integer',
            'output_tokens' => 'integer',
            'thinking_tokens' => 'integer',
            'cache_read_tokens' => 'integer',
            'cache_write_tokens' => 'integer',
            'total_tokens' => 'integer',
            'cost' => 'decimal:6',
            'latency_ms' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
