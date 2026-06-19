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
use Alexandria\Core\Models\ProjectSortingPrompt;
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
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
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

        /*
        | Backdate entries to their source note's creation date.
        |
        | When true, an entry that the AI executor creates from — or links a
        | note to — inherits that note's created_at whenever the note is
        | earlier, so an entry's "first created" honestly reflects when the
        | idea first existed (e.g. an imported 2022 note backdates the entry
        | it seeds). The source note is read from the command's
        | context.note_id. The date only ever moves earlier, never forward.
        |
        | Off by default to keep the package unopinionated; note-import-driven
        | apps set ALEXANDRIA_BACKDATE_TO_SOURCE_NOTE=true.
        */
        'backdate_to_source_note' => env('ALEXANDRIA_BACKDATE_TO_SOURCE_NOTE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Writing Dashboard
    |--------------------------------------------------------------------------
    |
    | Work types, format specs, length-plan presets, and starter structures
    | for the writing dashboard (works + sections). Override per-app by
    | publishing config/alexandria.php and editing.
    |
    */
    'writing' => [

        // Work types (selectable at creation; keys feed lang lookups + templates)
        'types' => ['novel', 'screenplay', 'stage_play', 'short_story', 'essay', 'poem', 'other'],

        // Format specs. Server side carries the page metrics; element lists and
        // keyboard transition maps are frontend modules (Plan 3).
        'formats' => [
            'prose' => [
                'words_per_page' => 250,
            ],
            'screenplay' => [
                'lines_per_page' => 55,
            ],
        ],

        // Length-plan presets. Seeded onto works.length_plan; every number is
        // user-editable afterwards. per_section_words feeds new-section targets.
        'length_plans' => [
            'short_story' => ['target_words' => 7500, 'per_section_words' => 2500],
            'novella' => ['target_words' => 30000, 'per_section_words' => 3000],
            'novel' => ['target_words' => 90000, 'per_section_words' => 3000],
            'epic' => ['target_words' => 150000, 'per_section_words' => 3500],
            'screenplay' => ['target_pages' => 110],
            'sonnet' => ['target_lines' => 14],
            'haiku' => ['target_lines' => 3],
            'villanelle' => ['target_lines' => 19],
            'limerick' => ['target_lines' => 5],
        ],

        // Starter structures per work type. label is the user-facing level name;
        // children nest one level here but the tree itself supports any depth.
        'templates' => [
            'novel' => [
                'format' => 'prose',
                'length_plan' => 'novel',
                'sections' => [
                    ['label' => 'Chapter', 'title' => 'Chapter 1'],
                    ['label' => 'Chapter', 'title' => 'Chapter 2'],
                    ['label' => 'Chapter', 'title' => 'Chapter 3'],
                ],
            ],
            'screenplay' => [
                'format' => 'screenplay',
                'length_plan' => 'screenplay',
                'sections' => [
                    ['label' => 'Act', 'title' => 'Act 1', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                    ['label' => 'Act', 'title' => 'Act 2', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                    ['label' => 'Act', 'title' => 'Act 3', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                ],
            ],
            'stage_play' => [
                'format' => 'screenplay',
                'length_plan' => 'screenplay',
                'sections' => [
                    ['label' => 'Act', 'title' => 'Act 1', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                    ['label' => 'Act', 'title' => 'Act 2', 'children' => [['label' => 'Scene', 'title' => 'Scene 1']]],
                ],
            ],
            'short_story' => [
                'format' => 'prose',
                'length_plan' => 'short_story',
                'sections' => [
                    ['label' => 'Section', 'title' => 'Opening'],
                ],
            ],
            'essay' => [
                'format' => 'prose',
                'sections' => [
                    ['label' => 'Section', 'title' => 'Draft'],
                ],
            ],
            'poem' => [
                'format' => 'prose',
                'sections' => [
                    // null title → the section inherits the work's title
                    // (the single section IS the poem).
                    ['label' => 'Poem', 'title' => null],
                ],
            ],
            'other' => [
                'format' => 'prose',
                'sections' => [
                    ['label' => 'Section', 'title' => 'Section 1'],
                ],
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Model Bindings
    |--------------------------------------------------------------------------
    |
    | Override public Alexandria models with your own subclasses. The
    | framework resolves extension-facing model classes through these
    | config values, never via direct class references. Internal support
    | models that are not extension seams, such as audit rows, invite
    | internals, permissions package tables, pivots, and derived writing
    | indexes, intentionally keep their default classes.
    |
    */
    'models' => [
        'ai_configuration' => AiConfiguration::class,
        'ai_model' => AiModel::class,
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
        'project_sorting_prompt' => ProjectSortingPrompt::class,
        'prompt_context_schema' => PromptContextSchema::class,
        'prompt_template' => PromptTemplate::class,
        'prompt_template_version' => PromptTemplateVersion::class,
        'relationship_blueprint' => RelationshipBlueprint::class,
        'user' => User::class,
        'user_ai_prompt' => UserAiPrompt::class,
        'user_ai_setting' => UserAiSetting::class,
        'user_api_key' => UserApiKey::class,
        'work' => Work::class,
        'work_section' => WorkSection::class,
    ],
];
