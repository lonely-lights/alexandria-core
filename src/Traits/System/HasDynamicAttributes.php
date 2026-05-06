<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits\System;

use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Trait HasDynamicAttributes
 *
 * Provides the EAV (Entry-Attribute-Value) functionality for a model.
 * It allows a model to have custom, user-defined attributes that are stored
 * in a separate table but accessed as if they were native properties.
 * This version supports both single and multi-value attributes.
 *
 * Performance: Uses in-memory caching, bulk inserts, and eager loading support
 * Type Casting: integer, boolean, float, date, json, text
 * Features: Multi-value fields, validation integration, automatic casting
 *
 * The using class must be an Eloquent Model with:
 * - `type` BelongsTo relationship to a Blueprint (with `fields` HasMany)
 * - `attributes` HasMany relationship to FieldValue
 * - `parent` BelongsTo self relationship (for getInheritedAttribute only)
 *
 * @mixin Model
 *
 * @property-read Blueprint|null $type
 * @property-read \Illuminate\Database\Eloquent\Collection<int, FieldValue> $attributes
 * @property-read static|null $parent
 * @property int|null $parent_id
 */
trait HasDynamicAttributes
{
    /**
     * Allowlist of Laravel validation rule names safe to apply to dynamic-field
     * input. The blueprint field's `validation_rules` JSON is filtered against
     * this list before reaching `Validator::make()` — anything else is treated
     * as field metadata, not a validation directive. Prevents accidental
     * activation of side-effecting rules (`exists`, `unique`, `dimensions`,
     * etc.) when an admin or AI authors validation_rules with unexpected keys.
     */
    private const array ALLOWED_VALIDATION_RULES = [
        'required', 'nullable', 'sometimes', 'present', 'filled',
        'string', 'integer', 'numeric', 'boolean', 'array',
        'min', 'max', 'between', 'size', 'digits', 'digits_between',
        'email', 'url', 'alpha', 'alpha_num', 'alpha_dash',
        'in', 'not_in', 'starts_with', 'ends_with',
        'date', 'date_format', 'before', 'after', 'before_or_equal', 'after_or_equal',
        'json', 'uuid', 'ulid', 'regex',
    ];

    /**
     * In-memory cache for attributes to prevent redundant database queries.
     */
    protected ?Collection $attributesCache = null;

    // Core Logic

    /**
     * Eager-load all field values for this entry and group them by blueprint-field name.
     */
    public function loadAttributes(): void
    {
        if (! is_null($this->attributesCache)) {
            return;
        }

        // Eager load the blueprintField relationship to avoid N+1 queries
        $attributesCollection = $this->relationLoaded('attributes')
            ? $this->getRelation('attributes')
            : $this->attributes()->with('blueprintField')->get();

        // Group by the field name from the blueprint field definition
        $this->attributesCache = $attributesCollection->groupBy(function ($fieldValue) {
            return $fieldValue->blueprintField?->name;
        });
    }

    /**
     * Retrieve a dynamic attribute, casting + collapsing to a scalar when only one value exists.
     */
    public function getDynamicAttribute(string $key): array|bool|float|int|string|Carbon|null
    {
        $this->loadAttributes();

        /** @var Collection|null $attributesGroup */
        $attributesGroup = $this->attributesCache->get($key);
        if (! $attributesGroup) {
            return null;
        }

        $this->loadMissing('type.fields');
        $fieldDefinition = $this->type?->fields->firstWhere('name', $key);
        $dataType = $fieldDefinition?->type ?? 'text';

        // Map over the group of field values and cast each one individually
        $castValues = $attributesGroup
            ->map(fn ($fv): array|bool|float|int|string|Carbon|null => $this->castFieldValue($fv->value, $dataType))
            ->filter(); // Remove any nulls that might have resulted from casting

        // If the group contains more than one item, return the full array. Otherwise, just the single item
        /** @var array|bool|float|int|string|Carbon|null $single */
        $single = $castValues->first();

        return $castValues->count() > 1 ? $castValues->all() : $single;
    }

    /**
     * Cast a raw field value string to the appropriate PHP type.
     */
    private function castFieldValue(?string $rawValue, string $dataType): array|bool|float|int|string|Carbon|null
    {
        if (is_null($rawValue)) {
            return null;
        }

        return match ($dataType) {
            'integer', 'entry_reference' => (int) $rawValue,
            'boolean' => filter_var($rawValue, FILTER_VALIDATE_BOOLEAN),
            'float' => (float) $rawValue,
            'date' => Carbon::parse($rawValue),
            'json', 'temporal' => json_decode($rawValue, true),
            // 'stardate' falls through to default: ISS seconds are stored as a
            // numeric string and the stardate plugin (deferred) does its own
            // parsing; no cast needed at this layer.
            default => $rawValue,
        };
    }

    /**
     * Sets a dynamic attribute, supporting single values and arrays of values.
     *
     * Deletes old values for the field and performs a bulk insert of new values,
     * creating one row for each item if value is an array.
     *
     * UPDATED 2025-11-22: Now uses blueprint_field_id FK instead of field_name string
     *
     * @param  string  $key  The name of the attribute (e.g., 'titles').
     * @param  mixed  $value  The value to set (can be a single value or an array).
     *
     * @throws RuntimeException when the field name isn't defined on the blueprint.
     * @throws ValidationException when the value violates the field's validation rules.
     */
    public function setDynamicAttribute(string $key, mixed $value): void
    {
        // Load blueprint fields to get the field definition and ID
        $this->loadMissing('type.fields');
        $fieldDefinition = $this->type?->fields->firstWhere('name', $key);

        // If field doesn't exist in blueprint, we can't store it
        if (! $fieldDefinition) {
            throw new RuntimeException("Field '$key' not found in blueprint '{$this->type?->name}'. Cannot set dynamic attribute.");
        }

        $blueprintFieldId = $fieldDefinition->id;

        // Delete all existing field values for this blueprint field
        FieldValue::query()
            ->where('entry_id', $this->id)
            ->where('blueprint_field_id', $blueprintFieldId)
            ->delete();

        // If the incoming value is null or an empty array, our work is done
        if (is_null($value) || (is_array($value) && empty($value))) {
            $this->attributesCache = null;
            $this->unsetRelation('attributes');

            return;
        }

        // Normalize the incoming value into an array so we can loop it
        $valuesToInsert = is_array($value) ? $value : [$value];
        $recordsToInsert = [];

        foreach ($valuesToInsert as $singleValue) {
            // Allowlist rule keys against ALLOWED_VALIDATION_RULES — anything
            // else (target_blueprint_slug, is_type_field, etc.) is field
            // metadata, not a Laravel rule directive.
            if (! empty($fieldDefinition->validation_rules)) {
                $realValidationRules = collect($fieldDefinition->validation_rules)
                    ->only(self::ALLOWED_VALIDATION_RULES)
                    ->all();
                if (! empty($realValidationRules)) {
                    Validator::make([$key => $singleValue], [$key => $realValidationRules])->validate();
                }
            }

            // Convert booleans to string for storage
            if (is_bool($singleValue)) {
                $singleValue = $singleValue ? '1' : '0';
            }

            // JSON-encode arrays/objects for temporal and json field types
            if (is_array($singleValue) || is_object($singleValue)) {
                $singleValue = json_encode($singleValue);
            }

            // Prepare a record for bulk insertion
            $recordsToInsert[] = [
                'entry_id' => $this->id,
                'blueprint_field_id' => $blueprintFieldId,
                'value' => $singleValue,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Perform a single, efficient bulk insert for all new values
        if (! empty($recordsToInsert)) {
            FieldValue::query()->insert($recordsToInsert);
        }

        // Invalidate the cache to force a reload with the new data on the next 'get'.
        // Also unset the loaded `attributes` relation: loadAttributes() prefers the
        // pre-loaded relation when present, so a stale relation cache would mask
        // the freshly-written rows on a write-then-read sequence on the same
        // instance (the common form-save pattern).
        $this->attributesCache = null;
        $this->unsetRelation('attributes');
    }

    /**
     * Resolve a dynamic attribute by walking up the parent_id hierarchy.
     * Returns the first non-null value found, or null if none exists.
     *
     * Useful for inherited properties like timezone — set once on a parent
     * (e.g., a country) and all descendants resolve it automatically.
     *
     * @param  int  $maxDepth  Safety limit to prevent infinite loops
     */
    public function getInheritedAttribute(string $fieldName, int $maxDepth = 20): mixed
    {
        $current = $this;

        for ($i = 0; $i < $maxDepth; $i++) {
            $value = $current->getDynamicAttribute($fieldName);
            if ($value !== null && $value !== '') {
                return $value;
            }

            if (! $current->parent_id) {
                return null;
            }

            // Walk to the next ancestor. Prefer the loaded `parent` relation;
            // fall back to a fresh DB lookup via the using class's query builder
            // (works regardless of which Model subclass mixes in this trait).
            $current = $current->parent ?? $current->newQuery()->find($current->parent_id);
            if (! $current) {
                return null;
            }
        }

        return null;
    }
}
