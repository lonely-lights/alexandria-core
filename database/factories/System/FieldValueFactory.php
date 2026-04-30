<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\System;

use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Field Value Factory
 *
 * Generates fake FieldValue instances for testing.
 *
 * FieldValue is the "Value" component of Alexandria's EAV system.
 * Each FieldValue stores a single value for an Entry's dynamic field.
 *
 * @extends Factory<FieldValue>
 *
 * @method FieldValue create($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method FieldValue make($attributes = [], ?\Illuminate\Database\Eloquent\Model $parent = null)
 * @method FieldValue createOne($attributes = [])
 * @method FieldValue makeOne($attributes = [])
 */
class FieldValueFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     */
    protected $model = FieldValue::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'entry_id' => Entry::factory(),
            'blueprint_field_id' => BlueprintField::factory(),
            'value' => fake()->sentence(),
        ];
    }

    /**
     * Create a field value for a specific entry.
     */
    public function forEntry(Entry $entry): static
    {
        return $this->state(fn (array $attributes) => [
            'entry_id' => $entry->id,
        ]);
    }

    /**
     * Create a field value for a specific field.
     */
    public function forField(BlueprintField $field): static
    {
        return $this->state(fn (array $attributes) => [
            'blueprint_field_id' => $field->id,
        ]);
    }

    /**
     * Create a field value for a specific entry and field combination.
     */
    public function forEntryField(Entry $entry, BlueprintField $field): static
    {
        return $this->state(fn (array $attributes) => [
            'entry_id' => $entry->id,
            'blueprint_field_id' => $field->id,
        ]);
    }

    /**
     * Set a specific value.
     *
     * Coerces the input to a storage-safe string:
     * - null becomes SQL NULL (not the empty string).
     * - bool becomes 'true' / 'false' (matches booleanValue()).
     * - array becomes a JSON-encoded string (callers wanting EAV multi-value
     *   semantics should create multiple FieldValue rows instead).
     * - everything else is cast to string.
     */
    public function withValue(mixed $value): static
    {
        $stringValue = match (true) {
            $value === null => null,
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => json_encode($value),
            default => (string) $value,
        };

        return $this->state(fn () => [
            'value' => $stringValue,
        ]);
    }

    /**
     * Create a text value.
     */
    public function textValue(): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => fake()->sentence(),
        ]);
    }

    /**
     * Create an integer value.
     */
    public function integerValue(?int $min = 1, ?int $max = 100): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => (string) fake()->numberBetween($min, $max),
        ]);
    }

    /**
     * Create a boolean value.
     */
    public function booleanValue(?bool $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => ($value ?? fake()->boolean()) ? 'true' : 'false',
        ]);
    }

    /**
     * Create a date value.
     */
    public function dateValue(?string $date = null): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => $date ?? fake()->date(),
        ]);
    }

    /**
     * Create an entry reference value.
     */
    public function entryReferenceValue(Entry $targetEntry): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => (string) $targetEntry->id,
        ]);
    }

    /**
     * Create a null/empty value.
     */
    public function nullValue(): static
    {
        return $this->state(fn (array $attributes) => [
            'value' => null,
        ]);
    }
}
