<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\AI;

use Alexandria\Core\Database\Factories\AI\PromptContextSchemaFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Prompt Context Schema
 *
 * Defines the JSON Schema for validating context data passed to prompts.
 * Each context type (e.g., ProjectCategorizationContext) has a schema
 * that describes the expected data structure.
 *
 * @property int $id
 * @property string $type Context class type (e.g., 'ProjectCategorizationContext')
 * @property string $version Schema version (e.g., '1.0')
 * @property array<string, mixed> $json_schema JSON Schema for validation
 * @property string|null $description Human-readable description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * @method static PromptContextSchemaFactory factory(int|callable|array|null $count = null, array $state = [])
 * @method static PromptContextSchema create(array $attributes = [])
 * @method static PromptContextSchema firstOrCreate(array $attributes = [], array $values = [])
 * @method static PromptContextSchema updateOrCreate(array $attributes = [], array $values = [])
 */
class PromptContextSchema extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): PromptContextSchemaFactory
    {
        return PromptContextSchemaFactory::new();
    }

    protected function casts(): array
    {
        return [
            'json_schema' => 'array',
        ];
    }

    /**
     * Find a schema by type and version.
     */
    public static function findByTypeAndVersion(string $type, string $version): ?self
    {
        return static::query()
            ->where('type', $type)
            ->where('version', $version)
            ->first();
    }

    /**
     * Get the latest version of a schema type.
     */
    public static function latestForType(string $type): ?self
    {
        return static::query()
            ->where('type', $type)
            ->orderByDesc('version')
            ->first();
    }

    /**
     * Validate data against this schema.
     *
     * Covers required-property presence and basic JSON Schema type checks
     * (string, integer, number, boolean, array, object, null).
     *
     * @param  array<string, mixed>  $data
     * @return array{valid: bool, errors: array<string>}
     */
    public function validate(array $data): array
    {
        $errors = [];
        $schema = $this->json_schema;

        // Check required properties — isset() rejects both missing keys AND null values,
        // closing the gap where ['foo' => null] previously satisfied a `required: [foo]` rule.
        if (isset($schema['required']) && is_array($schema['required'])) {
            foreach ($schema['required'] as $required) {
                if (! isset($data[$required])) {
                    $errors[] = __('Missing or null required property: :property', ['property' => $required]);
                }
            }
        }

        // Check property types (basic)
        if (isset($schema['properties']) && is_array($schema['properties'])) {
            foreach ($schema['properties'] as $property => $propertySchema) {
                if (array_key_exists($property, $data)) {
                    $value = $data[$property];
                    $expectedType = $propertySchema['type'] ?? null;

                    if ($expectedType && ! $this->matchesType($value, $expectedType)) {
                        $errors[] = __('Property :property must be of type :type', [
                            'property' => $property,
                            'type' => $expectedType,
                        ]);
                    }
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Check if a value matches an expected JSON Schema type.
     */
    private function matchesType(mixed $value, string $type): bool
    {
        return match ($type) {
            'string' => is_string($value),
            'integer' => is_int($value),
            'number' => is_numeric($value),
            'boolean' => is_bool($value),
            'array' => is_array($value) && array_is_list($value),
            'object' => is_array($value) && ! array_is_list($value),
            'null' => is_null($value),
            default => true,
        };
    }

    /**
     * Get templates that use this schema.
     *
     * @return Collection<int, PromptTemplate>
     */
    public function templates(): Collection
    {
        return PromptTemplate::query()
            ->where('required_context_type', $this->type)
            ->where('context_schema_version', $this->version)
            ->get();
    }
}
