<?php

declare(strict_types=1);
use Alexandria\Core\Models\AI\PromptContextSchema;
use Alexandria\Core\Models\AI\PromptTemplate;
use Alexandria\Core\Models\AI\PromptTemplateVersion;
use Alexandria\Core\Models\AiConfiguration;
use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Models\BlueprintView;
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\ProjectAiInstruction;
use Alexandria\Core\Models\ProjectAiSetting;
use Alexandria\Core\Models\System\AiPrompt;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Alexandria\Core\Models\UserAiPrompt;
use Alexandria\Core\Models\UserAiSetting;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Foundation\Auth\User;

it('exposes the User binding via config', function () {
    expect(config('alexandria.models.user'))
        ->toBe(User::class);
});

it('exposes the Project binding via config', function () {
    expect(config('alexandria.models.project'))
        ->toBe(Project::class);
});

it('exposes the EntryRelationship binding via config', function () {
    expect(config('alexandria.models.entry_relationship'))
        ->toBe(EntryRelationship::class);
});

it('exposes the RelationshipBlueprint binding via config', function () {
    expect(config('alexandria.models.relationship_blueprint'))
        ->toBe(RelationshipBlueprint::class);
});

it('exposes the BlueprintView binding via config', function () {
    expect(config('alexandria.models.blueprint_view'))
        ->toBe(BlueprintView::class);
});

it('exposes the AiProvider binding via config', function () {
    expect(config('alexandria.models.ai_provider'))
        ->toBe(AiProvider::class);
});

it('exposes the AiModel binding via config', function () {
    expect(config('alexandria.models.ai_model'))
        ->toBe(AiModel::class);
});

it('exposes the AiConfiguration binding via config', function () {
    expect(config('alexandria.models.ai_configuration'))
        ->toBe(AiConfiguration::class);
});

it('exposes the ProjectAiSetting binding via config', function () {
    expect(config('alexandria.models.project_ai_setting'))
        ->toBe(ProjectAiSetting::class);
});

it('exposes the ProjectAiInstruction binding via config', function () {
    expect(config('alexandria.models.project_ai_instruction'))
        ->toBe(ProjectAiInstruction::class);
});

it('exposes the UserAiSetting binding via config', function () {
    expect(config('alexandria.models.user_ai_setting'))
        ->toBe(UserAiSetting::class);
});

it('exposes the UserApiKey binding via config', function () {
    expect(config('alexandria.models.user_api_key'))
        ->toBe(UserApiKey::class);
});

it('exposes the AiPrompt binding via config', function () {
    expect(config('alexandria.models.ai_prompt'))
        ->toBe(AiPrompt::class);
});

it('exposes the UserAiPrompt binding via config', function () {
    expect(config('alexandria.models.user_ai_prompt'))
        ->toBe(UserAiPrompt::class);
});

it('exposes the PromptTemplate binding via config', function () {
    expect(config('alexandria.models.prompt_template'))
        ->toBe(PromptTemplate::class);
});

it('exposes the PromptTemplateVersion binding via config', function () {
    expect(config('alexandria.models.prompt_template_version'))
        ->toBe(PromptTemplateVersion::class);
});

it('exposes the PromptContextSchema binding via config', function () {
    expect(config('alexandria.models.prompt_context_schema'))
        ->toBe(PromptContextSchema::class);
});

it('publishes the alexandria config when vendor:publish is run', function () {
    $stub = realpath(__DIR__.'/../../config/alexandria.php');
    expect($stub)->toBeFile();
});
