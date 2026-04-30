<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NoteFactory;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\Tags\HasTags;

/**
 * Note Model
 *
 * Represents a note that can be associated with various models.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $title
 * @property Carbon|null $note_date
 * @property string $text
 * @property string $status
 * @property string|null $type
 * @property int|null $order_column
 * @property string $visibility
 * @property bool $is_pinned
 * @property string|null $color
 * @property array<string, mixed>|null $ai_notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Model|null $creator
 * @property-read Collection<int, NoteHistory> $histories
 * @property-read Collection<int, NoteLink> $links
 * @property-read Collection<int, Notebook> $notebooks
 * @property-read Collection<int, Blueprint> $blueprints
 * @property-read Collection<int, Blueprint> $pendingBlueprints
 * @property-read Collection<int, Blueprint> $processedBlueprints
 * @property mixed $tags
 */
class Note extends Model
{
    use HasFactory;
    use HasTags;
    use SoftDeletes;

    protected $guarded = ['id'];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        $this->setTable(config('notable-ai.notesTable', 'notes'));
    }

    protected static function newFactory(): NoteFactory
    {
        return NoteFactory::new();
    }

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'note_date' => 'datetime',
            'is_pinned' => 'boolean',
            'ai_notes' => 'array',
        ];
    }

    /**
     * Boot the model and set up event listeners.
     *
     * Records a NoteHistory snapshot whenever title, text, or note_date changes.
     */
    protected static function booted(): void
    {
        static::updating(function (Note $note): void {
            if ($note->isDirty('title') || $note->isDirty('text') || $note->isDirty('note_date')) {
                $note->histories()->create([
                    'user_id' => auth()->check() ? auth()->id() : null,
                    'previous_title' => $note->getOriginal('title'),
                    'previous_text' => $note->getOriginal('text'),
                    'previous_note_date' => $note->getOriginal('note_date'),
                ]);
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(NoteHistory::class)->latest();
    }

    public function links(): HasMany
    {
        return $this->hasMany(NoteLink::class);
    }

    public function notebooks(): BelongsToMany
    {
        return $this->belongsToMany(Notebook::class, 'notebook_notes')
            ->withPivot('sort_order', 'added_at');
    }

    /**
     * Get all blueprints this note has been routed to.
     */
    public function blueprints(): MorphToMany
    {
        return $this->morphedByMany(
            Blueprint::class,
            config('notable-ai.notable.morphName', 'notable'),
            config('notable-ai.notable.tableName', 'notables')
        )->withPivot(['processing_status', 'processed_at']);
    }

    /**
     * Get blueprints where this note is pending processing.
     */
    public function pendingBlueprints(): MorphToMany
    {
        return $this->blueprints()->wherePivot('processing_status', 'pending');
    }

    /**
     * Get blueprints where this note has been processed.
     */
    public function processedBlueprints(): MorphToMany
    {
        return $this->blueprints()->wherePivot('processing_status', 'completed');
    }

    /**
     * Check if this note has been routed to any blueprints.
     */
    public function hasBeenRouted(): bool
    {
        return $this->blueprints()->exists();
    }

    /**
     * Get all models this note is attached to (Projects, Blueprints, Entries, etc.)
     */
    public function getAttachments(): \Illuminate\Support\Collection
    {
        $tableName = config('notable-ai.notable.tableName', 'notables');

        $attachments = DB::table($tableName)
            ->where('note_id', $this->id)
            ->get(['notable_type', 'notable_id', 'processing_status']);

        return $attachments->map(function (object $row): ?object {
            $modelClass = $row->notable_type;
            if (! class_exists($modelClass)) {
                return null;
            }

            $model = $modelClass::find($row->notable_id);
            if (! $model) {
                return null;
            }

            return (object) [
                'model' => $model,
                'type' => class_basename($modelClass),
                'name' => method_exists($model, 'getNotableTitle') ? $model->getNotableTitle() : ($model->name ?? $model->title ?? 'Unknown'),
                'processing_status' => $row->processing_status,
            ];
        })->filter();
    }
}
