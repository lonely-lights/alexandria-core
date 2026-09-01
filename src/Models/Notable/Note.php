<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Alexandria\Core\Database\Factories\Notable\NoteFactory;
use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Builder;
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
 * @property-read NotablePivot $pivot
 * @property mixed $tags
 *
 * @method static NoteFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static Note create(array $attributes = [])
 * @method static Builder<static> query()
 * @method static Builder<static> where($column, $operator = null, $value = null, $boolean = 'and')
 * @method static Builder<static> whereIn(string $column, mixed $values, string $boolean = 'and', bool $not = false)
 * @method static Builder<static> withTrashed(bool $withTrashed = true)
 * @method static Builder<static> onlyTrashed()
 * @method static Note|null first(array|string $columns = ['*'])
 * @method static Note|null find(mixed $id, array|string $columns = ['*'])
 * @method static Note findOrFail(mixed $id, array|string $columns = ['*'])
 */
class Note extends Model
{
    use HasFactory;
    use HasTags;
    use SoftDeletes;

    /**
     * Notes table name. Owns the truth so callers can reference it without
     * spreading the literal everywhere.
     */
    public const string TABLE = 'notes';

    /**
     * Polymorphic pivot table that ties notes to attachable models
     * (projects, blueprints, entries, etc.).
     */
    public const string PIVOT_TABLE = 'notables';

    /**
     * Morph relation name used by the polymorphic pivot.
     */
    public const string MORPH_NAME = 'notable';

    protected $table = self::TABLE;

    protected $guarded = ['id'];

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
        return $this->morphedByMany(Blueprint::class, self::MORPH_NAME, self::PIVOT_TABLE)
            ->using(NotablePivot::class)
            ->withPivot(['processing_status', 'processed_at']);
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
     * Count of distinct active notes attached to any of the given notable
     * ids, across one or more notable types in a single query — used by
     * delete-impact endpoints so "how many notes would vanish from view"
     * stays accurate even when a note is attached to more than one of the
     * ids being counted (e.g. a work AND one of its sections).
     *
     * @param  array<class-string, array<int, int>>  $notableIdsByType  keyed by notable_type, e.g. [WorkSection::class => [1, 2, 3]]
     */
    public static function countForNotables(array $notableIdsByType): int
    {
        $notableIdsByType = array_filter($notableIdsByType, fn (array $ids): bool => $ids !== []);

        if ($notableIdsByType === []) {
            return 0;
        }

        return static::query()
            ->join(self::PIVOT_TABLE, 'notes.id', '=', self::PIVOT_TABLE.'.note_id')
            ->where('notes.status', 'active')
            ->where(function (Builder $query) use ($notableIdsByType): void {
                foreach ($notableIdsByType as $type => $ids) {
                    $query->orWhere(function (Builder $q) use ($type, $ids): void {
                        $q->where(self::PIVOT_TABLE.'.notable_type', $type)
                            ->whereIn(self::PIVOT_TABLE.'.notable_id', $ids);
                    });
                }
            })
            ->distinct('notes.id')
            ->count('notes.id');
    }

    /**
     * Get all models this note is attached to (Projects, Blueprints, Entries, etc.)
     */
    public function getAttachments(): \Illuminate\Support\Collection
    {
        $attachments = DB::table(self::PIVOT_TABLE)
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
