<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\System;

use Alexandria\Core\Database\Factories\System\EntryHistoryFactory;
use Eloquent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Entry History Model - Complete Audit Trail
 *
 * Maintains a complete audit trail of all changes to entries, including core fields,
 * dynamic attributes (via FieldValue changes), and metadata updates. Supports both
 * manual user edits and AI-driven modifications.
 *
 * Change Types:
 * - 'field_update': Core entry fields (name, slug, summary, content)
 * - 'attribute_update': Dynamic attributes via FieldValue (automatically tracked)
 * - 'metadata_update': Changes to metadata JSON column
 * - 'bulk_update': Multiple changes in one operation
 *
 * User Attribution:
 * - user_id is nullable to support system/AI changes
 * - Set to null automatically when user is deleted (foreign key: set null on delete)
 *
 * Automatic Tracking:
 * - FieldValue model automatically creates history records on create/update/delete
 * - Context field stores additional metadata (timestamp, action, field_value_id, etc.)
 *
 * @REVIEWED 2025-11-23 - Claude Code
 * Batch: 1.2 - EAV Core Models
 * Focus: History tracking, change types, user attribution, accessors
 * Cross-Refs: Batch 1.1 (entry_histories migration), FieldValue model (auto-tracking)
 * Issues: None
 *
 * @property int $id Primary key
 * @property int $entry_id Foreign key to entries table
 * @property int|null $user_id Foreign key to users table (null for system/AI changes)
 * @property string $change_type Enum: field_update, attribute_update, metadata_update, bulk_update
 * @property string|null $field_name Name of field that changed
 * @property string|null $previous_value Old value (TEXT)
 * @property string|null $new_value New value (TEXT)
 * @property string|null $change_summary Human-readable description
 * @property array|null $context Additional change metadata (JSON)
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Entry $entry Entry being tracked
 * @property-read User|null $user User who made change (null for system)
 * @property-read string $changeTypeName Human-readable change type (accessor)
 * @property-read string $formattedPreviousValue Formatted previous value (accessor)
 * @property-read string $formattedNewValue Formatted new value (accessor)
 *
 * @method static Builder|EntryHistory recent(int $limit = 20) Get recent changes
 * @method static Builder|EntryHistory ofType(string $changeType) Filter by change type
 * @method static Builder|EntryHistory byUser(int $userId) Filter by user
 *
 * @mixin Builder
 * @mixin Eloquent
 */
class EntryHistory extends Model
{
    /** @use HasFactory<EntryHistoryFactory> */
    use HasFactory;

    protected $table = 'entry_histories';

    protected $guarded = [];

    protected static function newFactory(): EntryHistoryFactory
    {
        return EntryHistoryFactory::new();
    }

    protected $casts = [
        'context' => 'array',
    ];

    /**
     * Available change types
     */
    public const CHANGE_TYPES = [
        'field_update' => 'Field Update',
        'attribute_update' => 'Attribute Update',
        'metadata_update' => 'Metadata Update',
        'bulk_update' => 'Bulk Update',
    ];

    /**
     * Get the entry this history record belongs to.
     */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'entry_id');
    }

    /**
     * Get the user who made this change.
     *
     * Resolves the User class through config('alexandria.models.user')
     * per ADR-006 — User lives in the consumer app, not core.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'));
    }

    /**
     * Get human-readable change type name.
     */
    public function getChangeTypeNameAttribute(): string
    {
        return self::CHANGE_TYPES[$this->change_type] ?? ucfirst(str_replace('_', ' ', $this->change_type));
    }

    /**
     * Get formatted previous value for display.
     */
    public function getFormattedPreviousValueAttribute(): string
    {
        if (is_null($this->previous_value)) {
            return '(empty)';
        }

        // Try to decode as JSON first
        $decoded = json_decode($this->previous_value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return json_encode($decoded, JSON_PRETTY_PRINT);
        }

        return $this->previous_value;
    }

    /**
     * Get formatted new value for display.
     */
    public function getFormattedNewValueAttribute(): string
    {
        if (is_null($this->new_value)) {
            return '(empty)';
        }

        // Try to decode as JSON first
        $decoded = json_decode($this->new_value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return json_encode($decoded, JSON_PRETTY_PRINT);
        }

        return $this->new_value;
    }

    /**
     * Scope to get recent changes.
     */
    public function scopeRecent(Builder $query, int $limit = 20): Builder
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    /**
     * Scope to filter by change type.
     */
    public function scopeOfType(Builder $query, string $changeType): Builder
    {
        return $query->where('change_type', $changeType);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}
