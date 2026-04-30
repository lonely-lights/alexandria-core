<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\AiPromptFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Database-backed prompt registry. Each row points at a template file
 * under resources/prompts/{template_path} in the host app. Versioning
 * is by row (key + version is unique). Status enum: active / inactive
 * / archived.
 *
 * @property int $id
 * @property string $name
 * @property string $key
 * @property int $version
 * @property string $template_path
 * @property string $status
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @method static Builder<static> active()
 */
class AiPrompt extends Model
{
    use HasFactory;

    protected $table = 'ai_prompts';

    protected $guarded = ['id'];

    protected static function newFactory(): AiPromptFactory
    {
        return AiPromptFactory::new();
    }

    protected function casts(): array
    {
        return [
            'version' => 'integer',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
