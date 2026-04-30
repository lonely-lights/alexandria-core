<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\AI;

use Alexandria\Core\Database\Factories\AI\PromptTemplateVersionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Prompt Template Version
 *
 * Stores historical versions of prompt templates for audit trail and rollback.
 * Append-only — only created_at is recorded (no updated_at).
 *
 * @property int $id
 * @property int $prompt_template_id
 * @property int $version Version number
 * @property string $template The template content at this version
 * @property int|null $changed_by Host-app user id — no FK constraint per ADR-006
 * @property string|null $change_reason Why the change was made
 * @property Carbon|null $created_at
 * @property-read PromptTemplate $promptTemplate
 * @property-read Model|null $changedByUser
 */
class PromptTemplateVersion extends Model
{
    use HasFactory;

    /** @var bool This table only has created_at — no updated_at column. */
    public $timestamps = false;

    protected $guarded = ['id'];

    protected static function newFactory(): PromptTemplateVersionFactory
    {
        return PromptTemplateVersionFactory::new();
    }

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Boot the model and set created_at automatically on insert.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model): void {
            $model->created_at = $model->created_at ?? now();
        });
    }

    /**
     * Get the parent template.
     */
    public function promptTemplate(): BelongsTo
    {
        return $this->belongsTo(PromptTemplate::class);
    }

    /**
     * Get the user who made this change.
     * Resolved via config('alexandria.models.user') so the host-app's User class is used.
     */
    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'changed_by');
    }

    /**
     * Get a diff between this version and another version.
     *
     * @return array{added: int, removed: int, changed: bool}
     */
    public function diffWith(PromptTemplateVersion $other): array
    {
        $thisLines = explode("\n", $this->template);
        $otherLines = explode("\n", $other->template);

        $added = count(array_diff($otherLines, $thisLines));
        $removed = count(array_diff($thisLines, $otherLines));

        return [
            'added' => $added,
            'removed' => $removed,
            'changed' => $added > 0 || $removed > 0,
        ];
    }
}
