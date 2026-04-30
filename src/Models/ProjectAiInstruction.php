<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\ProjectAiInstructionFactory;
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Named AI instruction sets attached to a project. Used to populate
 * AI prompts with project-specific context. The default flag marks
 * the primary instruction set used by default writes.
 *
 * @property int $id
 * @property int $project_id
 * @property string $label
 * @property string $instructions
 * @property bool $is_default
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Project $project
 *
 * @method static ProjectAiInstructionFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static ProjectAiInstruction create(array $attributes = [])
 */
class ProjectAiInstruction extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): ProjectAiInstructionFactory
    {
        return ProjectAiInstructionFactory::new();
    }

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
