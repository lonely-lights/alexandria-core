<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories;

use Alexandria\Core\Models\EmailOverride;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<EmailOverride>
 *
 * @method EmailOverride create($attributes = [], ?Model $parent = null)
 * @method EmailOverride make($attributes = [], ?Model $parent = null)
 * @method EmailOverride createOne($attributes = [])
 * @method EmailOverride makeOne($attributes = [])
 */
class EmailOverrideFactory extends Factory
{
    protected $model = EmailOverride::class;

    public function definition(): array
    {
        return [
            'mail_slug' => fake()->randomElement(['verify', 'reset']),
            'lang_key' => fake()->randomElement(['subject', 'greeting', 'intro', 'action']),
            'locale' => 'en',
            'content' => fake()->sentence(),
            'updated_by' => null,
        ];
    }

    public function forVerify(string $langKey = 'subject'): static
    {
        return $this->state([
            'mail_slug' => 'verify',
            'lang_key' => $langKey,
        ]);
    }

    public function forReset(string $langKey = 'subject'): static
    {
        return $this->state([
            'mail_slug' => 'reset',
            'lang_key' => $langKey,
        ]);
    }
}
