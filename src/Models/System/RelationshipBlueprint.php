<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\RelationshipBlueprintFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $from_blueprint_id
 * @property int $to_blueprint_id
 * @property string $relationship_name
 * @property string|null $from_label
 * @property string|null $to_label
 * @property string $ai_priority
 * @property string|null $ai_instruction
 * @property array<int, string>|null $context_triggers
 * @property bool $is_bidirectional
 * @property int|null $max_connections
 * @property array<string, mixed>|null $metadata_schema
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Blueprint $fromBlueprint
 * @property-read Blueprint $toBlueprint
 *
 * @method static RelationshipBlueprintFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static RelationshipBlueprint create(array $attributes = [])
 */
class RelationshipBlueprint extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected static function newFactory(): RelationshipBlueprintFactory
    {
        return RelationshipBlueprintFactory::new();
    }

    protected function casts(): array
    {
        return [
            'context_triggers' => 'array',
            'metadata_schema' => 'array',
            'is_bidirectional' => 'boolean',
        ];
    }

    public function fromBlueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class, 'from_blueprint_id');
    }

    public function toBlueprint(): BelongsTo
    {
        return $this->belongsTo(Blueprint::class, 'to_blueprint_id');
    }

    /**
     * Get all relationship blueprints involving a specific Blueprint
     * (whether as the source or the target).
     *
     * @return Collection<int, RelationshipBlueprint>
     */
    public static function forBlueprint(Blueprint $blueprint): Collection
    {
        return static::query()
            ->where('from_blueprint_id', $blueprint->id)
            ->orWhere('to_blueprint_id', $blueprint->id)
            ->with(['fromBlueprint', 'toBlueprint'])
            ->get();
    }

    /**
     * Check if this relationship's context triggers match anywhere in the given content.
     */
    public function shouldTriggerForContent(string $content): bool
    {
        if (empty($this->context_triggers)) {
            return false;
        }

        $haystack = strtolower($content);

        return array_any(
            $this->context_triggers,
            fn (string $trigger): bool => str_contains($haystack, strtolower($trigger)),
        );
    }

    /**
     * Get all required-priority relationship blueprints for a Blueprint.
     *
     * @return Collection<int, RelationshipBlueprint>
     */
    public static function getRequiredForBlueprint(Blueprint $blueprint): Collection
    {
        return static::forBlueprint($blueprint)
            ->where('ai_priority', 'required');
    }
}
