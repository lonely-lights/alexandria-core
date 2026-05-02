<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\AiProviderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $website
 * @property string|null $notes
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, AiModel> $models
 * @property-read Collection<int, AiModel> $activeModels
 *
 * @method static AiProviderFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static AiProvider create(array $attributes = [])
 * @method static AiProvider updateOrCreate(array $attributes, array $values = [])
 * @method static Builder<AiProvider> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<AiProvider> query()
 */
class AiProvider extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): AiProviderFactory
    {
        return AiProviderFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function models(): HasMany
    {
        return $this->hasMany(AiModel::class, 'ai_provider_id');
    }

    public function activeModels(): HasMany
    {
        return $this->models()->where('is_active', true);
    }

    /**
     * Models suitable for analyst tasks (analyst category + general fallback),
     * ordered by recommended-first then newest.
     */
    public function analystModels(): Builder
    {
        /** @var Builder<AiModel> $query */
        $query = $this->activeModels()->getQuery();

        return $query
            ->where(function ($q) {
                $q->where('category', 'analyst')->orWhere('category', 'general');
            })
            ->recommendedFirst();
    }

    /**
     * Models suitable for creative tasks (creative category + general fallback),
     * ordered by recommended-first then newest.
     */
    public function creativeModels(): Builder
    {
        /** @var Builder<AiModel> $query */
        $query = $this->activeModels()->getQuery();

        return $query
            ->where(function ($q) {
                $q->where('category', 'creative')->orWhere('category', 'general');
            })
            ->recommendedFirst();
    }
}
