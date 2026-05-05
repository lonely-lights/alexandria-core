<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryHistoryFactory;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Audit-trail row for an Entry change. user_id is nullable to support
 * system/AI-driven edits; resolved through config('alexandria.models.user')
 * per ADR-006.
 *
 * @property int $id
 * @property int $entry_id
 * @property int|null $user_id
 * @property string $change_type
 * @property string|null $field_name
 * @property string|null $previous_value
 * @property string|null $new_value
 * @property string|null $change_summary
 * @property array<string, mixed>|null $context
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Entry $entry
 * @property-read Authenticatable|null $user
 * @property-read string $change_type_name
 * @property-read string $formatted_previous_value
 * @property-read string $formatted_new_value
 *
 * @method static Builder<static> recent(int $limit = 20)
 * @method static Builder<static> ofType(string $changeType)
 * @method static Builder<static> byUser(int $userId)
 * @method static EntryHistoryFactory factory(int|callable|array|null $count = null, array $state = [])
 */
class EntryHistory extends Model
{
    /** @use HasFactory<EntryHistoryFactory> */
    use HasFactory;

    public const array CHANGE_TYPES = [
        'field_update' => 'Field Update',
        'attribute_update' => 'Attribute Update',
        'metadata_update' => 'Metadata Update',
        'bulk_update' => 'Bulk Update',
    ];

    protected $table = 'entry_histories';

    protected $guarded = ['id'];

    protected static function newFactory(): EntryHistoryFactory
    {
        return EntryHistoryFactory::new();
    }

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'entry_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'));
    }

    protected function changeTypeName(): Attribute
    {
        return Attribute::get(fn (): string => self::CHANGE_TYPES[$this->change_type]
            ?? ucfirst(str_replace('_', ' ', $this->change_type)));
    }

    protected function formattedPreviousValue(): Attribute
    {
        return Attribute::get(fn (): string => $this->formatStoredValue($this->previous_value));
    }

    protected function formattedNewValue(): Attribute
    {
        return Attribute::get(fn (): string => $this->formatStoredValue($this->new_value));
    }

    /**
     * Render a stored value: pretty JSON if it round-trips, else raw text,
     * else '(empty)' for null. Shared between previous/new accessors.
     */
    private function formatStoredValue(?string $stored): string
    {
        if ($stored === null) {
            return '(empty)';
        }

        $decoded = json_decode($stored, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return json_encode($decoded, JSON_PRETTY_PRINT);
        }

        return $stored;
    }

    public function scopeRecent(Builder $query, int $limit = 20): Builder
    {
        return $query->orderByDesc('created_at')->limit($limit);
    }

    public function scopeOfType(Builder $query, string $changeType): Builder
    {
        return $query->where('change_type', $changeType);
    }

    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}
