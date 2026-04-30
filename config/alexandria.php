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
use Alexandria\Core\Models\Notable\AiReviewCommand;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Models\ProjectAiInstruction;
use Alexandria\Core\Models\ProjectAiSetting;
use Alexandria\Core\Models\System\AiPrompt;
use Alexandria\Core\Models\System\AiTransaction;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Models\System\FieldValue;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Alexandria\Core\Models\UserAiPrompt;
use Alexandria\Core\Models\UserAiSetting;
use Alexandria\Core\Models\UserApiKey;
use Illuminate\Foundation\Auth\User;

return [
    /*
    |--------------------------------------------------------------------------
    | Media Library
    |--------------------------------------------------------------------------
    |
    | Image conversion dimensions for HasAlexandriaMedia. Each registered
    | collection (page_image, banner, gallery) declares its sizes here.
    | Override per-app by publishing config/alexandria.php and editing.
    |
    */
    'media' => [
        'page_image' => [
            'square' => ['width' => 512, 'height' => 512],
            'thumb' => ['width' => 128, 'height' => 128],
            'small' => ['width' => 64, 'height' => 64],
            'max_upload_size' => 5120,
        ],
        'banner' => [
            'desktop' => ['width' => 1920, 'height' => 400],
            'mobile' => ['width' => 800, 'height' => 600],
            'preview' => ['width' => 600, 'height' => 150],
            'max_upload_size' => 10240,
        ],
        'gallery' => [
            'display' => ['width' => 1200],
            'thumb' => ['width' => 256, 'height' => 256],
            'max_upload_size' => 10240,
        ],
        'accepted_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        'crop_ratios' => [
            '3:2' => 1.5,
            '2:3' => 0.667,
            '16:9' => 1.778,
            '1:1' => 1.0,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Credential Strategy
    |--------------------------------------------------------------------------
    |
    | Controls how CredentialResolver behaves when a user has no active
    | UserApiKey for their selected provider.
    |
    | allow_env_fallback (default: false)
    |   - false: Throw NoApiKeyAvailableException — the SaaS-safe default.
    |     Users without a BYOK key get a clear "set up your API key" error
    |     rather than silently billing the operator's env-configured key.
    |   - true: Fall back to ai.providers.<sdk-key>.key from the laravel/ai
    |     SDK's config — appropriate for self-hosted deployments where the
    |     operator IS the user, and the env key is theirs.
    |
    | Set via the ALEXANDRIA_AI_ALLOW_ENV_FALLBACK env var, or override
    | per-app by publishing config/alexandria.php.
    |
    */
    'ai' => [
        'allow_env_fallback' => env('ALEXANDRIA_AI_ALLOW_ENV_FALLBACK', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Model Bindings
    |--------------------------------------------------------------------------
    |
    | Override any Alexandria model with your own subclass. The framework
    | resolves model classes through these config values, never via direct
    | class references. To swap a model, extend the default class and
    | replace the binding here.
    |
    */
    'models' => [
        'ai_configuration' => AiConfiguration::class,
        'ai_model' => AiModel::class,
        'ai_prompt' => AiPrompt::class,
        'ai_provider' => AiProvider::class,
        'ai_review_command' => AiReviewCommand::class,
        'ai_transaction' => AiTransaction::class,
        'blueprint' => Blueprint::class,
        'blueprint_field' => BlueprintField::class,
        'blueprint_view' => BlueprintView::class,
        'entry' => Entry::class,
        'entry_relationship' => EntryRelationship::class,
        'field_value' => FieldValue::class,
        'note' => Note::class,
        'project' => Project::class,
        'project_ai_instruction' => ProjectAiInstruction::class,
        'project_ai_setting' => ProjectAiSetting::class,
        'prompt_context_schema' => PromptContextSchema::class,
        'prompt_template' => PromptTemplate::class,
        'prompt_template_version' => PromptTemplateVersion::class,
        'relationship_blueprint' => RelationshipBlueprint::class,
        'user' => User::class,
        'user_ai_prompt' => UserAiPrompt::class,
        'user_ai_setting' => UserAiSetting::class,
        'user_api_key' => UserApiKey::class,
    ],
];
