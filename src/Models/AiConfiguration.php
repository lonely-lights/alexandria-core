<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\AiConfigurationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $configurable_type
 * @property int $configurable_id
 * @property string $type
 * @property string|null $instructions
 * @property array<string, mixed>|null $metadata
 * @property int $priority
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @method static Builder<static> ofType(string $type)
 * @method static Builder<static> active()
 * @method static Builder<static> byPriority()
 */
class AiConfiguration extends Model
{
    use HasFactory;

    public const string TYPE_BLUEPRINT_INSTRUCTIONS = 'blueprint_instructions';

    public const string TYPE_FIELD_INSTRUCTIONS = 'field_instructions';

    public const string TYPE_PROMPT_TEMPLATE = 'prompt_template';

    public const string TYPE_VALIDATION_RULES = 'validation_rules';

    protected $fillable = [
        'configurable_type',
        'configurable_id',
        'type',
        'instructions',
        'metadata',
        'priority',
        'is_active',
    ];

    protected static function newFactory(): AiConfigurationFactory
    {
        return AiConfigurationFactory::new();
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ];
    }

    public function configurable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeByPriority(Builder $query): Builder
    {
        return $query->orderBy('priority');
    }
}
