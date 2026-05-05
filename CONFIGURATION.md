# Configuring Alexandria Core

This file documents every config key and environment variable Alexandria Core reads. For installation steps, see [`INSTALL.md`](INSTALL.md). For overriding defaults, see [`docs/EXTENDING.md`](docs/EXTENDING.md).

The package's own config file lives at `vendor/lonely-lights/alexandria-core/config/alexandria.php`. Publish a local copy to your app to override anything below:

```bash
php artisan vendor:publish --tag=alexandria-config
```

---

## `alexandria.media`

Image conversion dimensions and upload limits per media collection. Each top-level key maps to a media collection registered through `HasAlexandriaMedia`.

| Collection | Conversions | Max upload size (KB) |
|---|---|---|
| `page_image` | `square` (512×512), `thumb` (128×128), `small` (64×64) | 5,120 |
| `banner` | `desktop` (1920×400), `mobile` (800×600), `preview` (600×150) | 10,240 |
| `gallery` | `display` (1200 wide), `thumb` (256×256) | 10,240 |

Two cross-collection knobs:

- `alexandria.media.accepted_mimes` — defaults to `['image/jpeg', 'image/png', 'image/webp']`. Add more if you need (e.g., `'image/avif'`).
- `alexandria.media.crop_ratios` — keys are display labels (`'3:2'`), values are floats consumed by the crop UI.

Any conversion smaller than the source is generated; conversions larger than the source are skipped automatically.

---

## `alexandria.ai`

### `allow_env_fallback` (default: `false`)

Controls how `CredentialResolver` behaves when the active user has no `UserApiKey` row for their selected provider.

- **`false` — SaaS-safe default.** Throws `NoApiKeyAvailableException`. The user gets a clear "set up your API key" prompt instead of silently billing the operator's environment-configured key. **Use this if you're running Alexandria as a service for other people.**
- **`true` — self-hosted default.** Falls back to `ai.providers.<sdk-key>.key` from the `laravel/ai` SDK config. Appropriate when the operator IS the user and the env-configured key is theirs.

Set via `ALEXANDRIA_AI_ALLOW_ENV_FALLBACK=true` in `.env`, or override per-app by publishing `config/alexandria.php`.

### How AI features work, and what stays under user control

These are factual descriptions of the architecture, useful both as operator-facing documentation and as a reference for users who care where authorship boundaries land:

- **Bring-your-own-key (BYOK).** When `allow_env_fallback=false`, every AI call dispatches through the user's own `UserApiKey` row. The operator doesn't pay for or see the user's prompts; the user owns the model choice (Claude / GPT-4 / Gemini / etc.) and the spend.
- **Review before execute.** AI commands (create entry, transfer note, create relationship, etc.) land in the `ai_review_commands` table with `status = 'pending'` first. Nothing modifies the user's data until they explicitly approve a batch. Each command exposes its `payload`, `reasoning`, and the AI's interpretation; the user can edit, reject, or partially approve.
- **Prompt visibility.** The system prompts that drive AI behavior are stored in the `prompt_templates` table and are inspectable via `notes/{noteId}/prompt-preview` before triggering an AI run. Users see what the model was actually asked.
- **No background AI.** AI runs only on explicit user action — clicking categorize, sort, integrate. There is no automated AI processing of user content without an in-flight user decision.
- **Per-project sorting prompts.** Users can write their own preamble (`project_sorting_prompts` table) that gets prepended to the default classification prompt. The user steers the model rather than accepting whatever the system would default to.

The configuration choices on this page tune those affordances; they don't replace them.

---

## `alexandria.models`

Every public Eloquent model in core is resolvable through `config('alexandria.models.<key>')`. Override by extending the default class and replacing the binding. Full walk-through in [`docs/EXTENDING.md`](docs/EXTENDING.md) Section 2.

The keys (default class in parens):

| Key | Default class |
|---|---|
| `ai_configuration` | `Alexandria\Core\Models\AiConfiguration` |
| `ai_model` | `Alexandria\Core\Models\AiModel` |
| `ai_prompt` | `Alexandria\Core\Models\System\AiPrompt` |
| `ai_provider` | `Alexandria\Core\Models\AiProvider` |
| `ai_review_command` | `Alexandria\Core\Models\Notable\AiReviewCommand` |
| `ai_transaction` | `Alexandria\Core\Models\System\AiTransaction` |
| `blueprint` | `Alexandria\Core\Models\System\Blueprint` |
| `blueprint_field` | `Alexandria\Core\Models\System\BlueprintField` |
| `blueprint_view` | `Alexandria\Core\Models\BlueprintView` |
| `entry` | `Alexandria\Core\Models\System\Entry` |
| `entry_relationship` | `Alexandria\Core\Models\System\EntryRelationship` |
| `field_value` | `Alexandria\Core\Models\System\FieldValue` |
| `note` | `Alexandria\Core\Models\Notable\Note` |
| `project` | `Alexandria\Core\Models\Framework\Project` |
| `project_ai_instruction` | `Alexandria\Core\Models\ProjectAiInstruction` |
| `project_ai_setting` | `Alexandria\Core\Models\ProjectAiSetting` |
| `project_sorting_prompt` | `Alexandria\Core\Models\ProjectSortingPrompt` |
| `prompt_context_schema` | `Alexandria\Core\Models\AI\PromptContextSchema` |
| `prompt_template` | `Alexandria\Core\Models\AI\PromptTemplate` |
| `prompt_template_version` | `Alexandria\Core\Models\AI\PromptTemplateVersion` |
| `relationship_blueprint` | `Alexandria\Core\Models\System\RelationshipBlueprint` |
| `user` | `Illuminate\Foundation\Auth\User` (override to your app's `User`) |
| `user_ai_prompt` | `Alexandria\Core\Models\UserAiPrompt` |
| `user_ai_setting` | `Alexandria\Core\Models\UserAiSetting` |
| `user_api_key` | `Alexandria\Core\Models\UserApiKey` |

Use the resolver in your own code instead of hardcoding the FQCN:

```php
$projectClass = config('alexandria.models.project');
$project = $projectClass::create(['name' => 'New project']);
```

---

## Environment variables

Variables Alexandria Core reads directly from `.env`:

### AI

| Variable | Purpose | Default |
|---|---|---|
| `ALEXANDRIA_AI_ALLOW_ENV_FALLBACK` | Allow falling back to env-configured AI keys when a user has no BYOK key. | `false` |
| `ANTHROPIC_API_KEY` | Default Anthropic key (only consulted when `allow_env_fallback=true`). | — |
| `OPENAI_API_KEY` | Default OpenAI key (only consulted when `allow_env_fallback=true`). | — |
| `GOOGLE_AI_API_KEY` | Default Google AI key (only consulted when `allow_env_fallback=true`). | — |

### Broadcasting (Reverb)

Used by the `NoteAiStatusUpdated` event so the user's browser can react to AI processing state in real time.

| Variable | Purpose |
|---|---|
| `BROADCAST_CONNECTION` | Set to `reverb`. |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | Reverb app credentials. |
| `REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME` | Reverb server endpoint. |
| `VITE_REVERB_APP_KEY` / `VITE_REVERB_HOST` / `VITE_REVERB_PORT` / `VITE_REVERB_SCHEME` | Same values mirrored to Vite for the JS Echo client. |

If you're on Laravel Herd, the bundled Reverb listens at `reverb-8080.herd.test` with app id `1001` and key `laravel-herd`. See [`INSTALL.md`](INSTALL.md) Section 6.

### Standard Laravel keys

Core relies on Laravel's normal `DB_*`, `MAIL_*`, `QUEUE_CONNECTION`, `APP_KEY`, etc. Nothing Alexandria-specific layers on top.

---

## Per-user settings

Three database-backed knobs the user controls themselves through the UI. Listed here so operators know which tables to seed / back up / inspect:

- `user_ai_settings` — chosen `ai_provider_id`, analyst/creative/image/video model selections, active API-key id.
- `user_api_keys` — encrypted BYOK keys per provider with `is_active` flag.
- `privacy_settings` — per-field profile visibility (`tagline`, `bio`, `private_bio`, `location`, `website`, `pronouns`).

The seeders for AI providers and models live at `database/seeders/AiProviderSeeder.php` and `AiModelSeeder.php` inside the package; running them populates the available options users can choose between.

---

## Per-project settings

Two project-scoped tables:

- `project_ai_settings` — per-project model overrides (when set, override `user_ai_settings` for that project).
- `project_sorting_prompts` — user-authored preambles prepended to the AI classifier's system prompt for that project.

These exist so a single user can have different AI behavior across projects without re-typing instructions every time.

---

## What's *not* configurable

Out of scope for `v0.1.0`:

- **Field type registry.** Custom field types currently require contributing back to core.
- **Per-tenant config injection.** Single-tenant first; multi-tenancy can be layered with subdomain middleware.
- **Auto-published page re-export stubs.** The page-resolver glob covers all known cases; see [`docs/EXTENDING.md`](docs/EXTENDING.md) Section 3.

If something you need to configure isn't listed above, that's a bug — file an issue at [github.com/lonely-lights/alexandria-core/issues](https://github.com/lonely-lights/alexandria-core/issues).
