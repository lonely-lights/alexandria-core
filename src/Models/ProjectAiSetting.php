<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\ProjectAiSettingFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Project-scoped AI configuration that overrides user defaults. Null
 * fields fall back to the user's UserAiSetting equivalent.
 *
 * @property int $id
 * @property int $project_id
 * @property bool $ai_enabled
 * @property bool $auto_categorize
 * @property bool $require_approval
 * @property bool $use_optimized_ai_sort
 * @property float $optimized_ai_sort_confidence_threshold
 * @property int|null $ai_provider_id
 * @property string|null $analyst_model_name
 * @property string|null $creative_model_name
 * @property float|null $monthly_budget
 * @property float|null $per_request_limit
 * @property string $default_routing_action
 * @property array<int, string>|null $enabled_features
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 * @property-read AiProvider|null $provider
 *
 * @method static ProjectAiSettingFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static ProjectAiSetting create(array $attributes = [])
 */
class ProjectAiSetting extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $attributes = [
        'ai_enabled' => true,
        'auto_categorize' => false,
        'require_approval' => true,
        'use_optimized_ai_sort' => false,
        'optimized_ai_sort_confidence_threshold' => 0.75,
        'default_routing_action' => 'suggest',
    ];

    protected static function newFactory(): ProjectAiSettingFactory
    {
        return ProjectAiSettingFactory::new();
    }

    protected function casts(): array
    {
        return [
            'ai_enabled' => 'boolean',
            'auto_categorize' => 'boolean',
            'require_approval' => 'boolean',
            'use_optimized_ai_sort' => 'boolean',
            'optimized_ai_sort_confidence_threshold' => 'decimal:2',
            'monthly_budget' => 'decimal:2',
            'per_request_limit' => 'decimal:4',
            'enabled_features' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    /**
     * Effective analyst model: project override OR user default.
     */
    public function getEffectiveAnalystModel(?UserAiSetting $userSetting = null): ?string
    {
        return $this->analyst_model_name ?? $userSetting?->analyst_model_name;
    }

    public function getEffectiveCreativeModel(?UserAiSetting $userSetting = null): ?string
    {
        return $this->creative_model_name ?? $userSetting?->creative_model_name;
    }

    public function getEffectiveProviderId(?UserAiSetting $userSetting = null): ?int
    {
        return $this->ai_provider_id ?? $userSetting?->ai_provider_id;
    }

    public function isAiAvailable(): bool
    {
        return $this->ai_enabled;
    }

    public function isFeatureEnabled(string $feature): bool
    {
        if (! $this->ai_enabled) {
            return false;
        }

        // null enabled_features = all features enabled by default
        if ($this->enabled_features === null) {
            return true;
        }

        return in_array($feature, $this->enabled_features, true);
    }

    // Budget tracking methods (getCurrentMonthSpending, isWithinBudget,
    // getBudgetUsagePercentage) are deferred. They depend on Project::aiTransactions()
    // which the AiTransaction model + sub-slice provides. Add back when that lands.
}
