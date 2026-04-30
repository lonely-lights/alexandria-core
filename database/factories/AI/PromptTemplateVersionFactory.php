<?php

declare(strict_types=1);

namespace Alexandria\Core\Database\Factories\AI;

use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Models\AI\PromptTemplateVersion;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<PromptTemplateVersion>
 *
 * @method PromptTemplateVersion create($attributes = [], ?Model $parent = null)
 * @method PromptTemplateVersion make($attributes = [], ?Model $parent = null)
 * @method PromptTemplateVersion createOne($attributes = [])
 * @method PromptTemplateVersion makeOne($attributes = [])
 */
class PromptTemplateVersionFactory extends Factory
{
    protected $model = PromptTemplateVersion::class;

    public function definition(): array
    {
        return [
            'prompt_template_id' => PromptTemplate::factory(),
            'version' => 1,
            'template' => "You are a worldbuilding AI assistant.\n\n[DATA_CONTEXT]\n\nPlease categorize the data above.",
            'changed_by' => null,
            'change_reason' => null,
        ];
    }

    public function forTemplate(PromptTemplate $template): self
    {
        return $this->state(fn () => ['prompt_template_id' => $template->id]);
    }
}
