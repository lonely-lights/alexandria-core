# Alexandria Core

> **Note:** This package is in early development (`0.x`). The public API is intentionally unstable until `1.0`. Pin to an exact version while we shake out the contracts.

The framework half of [Alexandria](https://github.com/lonely-lights/alexandria-legacy) — an AI-aware Laravel application for structured worldbuilding, narrative archives, RPG campaign records, and any other domain where you need a flexible Entity-Attribute-Value graph with an Inertia/React UI on top.

This is the public, content-free framework you can drop into a fresh Laravel app to get the full Alexandria experience without inheriting any project-specific data.

## Status

🏗️ **Pre-release.** The package is being extracted from a private working app. APIs, table names, and config keys may shift before `v1.0`. See [`CHANGELOG.md`](CHANGELOG.md) for breaking changes.

## What's in the box

- **EAV core** — `Project`, `Blueprint`, `BlueprintField`, `Entry`, `FieldValue`, `EntryRelationship` models with dynamic field storage and slug-based routing.
- **AI agents + provider abstraction** — pluggable interface over Anthropic, OpenAI, and Google AI; batch AI command pipeline with prompt caching, dual-queue architecture, and rate-limit handling.
- **View registry** — Inertia/React-driven entry pages with Kanban, Graph, Gallery, and Table views — extensible per-blueprint.
- **Media library wiring** — `spatie/laravel-medialibrary` integration with conversions and responsive images.
- **Permissions, activity log, tags** — `spatie/laravel-permission`, `spatie/laravel-activitylog`, `spatie/laravel-tags` pre-wired.
- **Headless auth** — `laravel/fortify` registered out of the box (login, registration, password reset, 2FA).
- **Translation framework** — works alongside [`lonely-lights/prosetta`](https://github.com/lonely-lights/prosetta) for database-driven UI translations.
- **Inertia + React SPA** — TypeScript pages distributed via Composer; consumers wire one Vite alias.

## What's deliberately **not** in the box

This package ships with **zero defaults**:

- No seeded blueprints (Character, Location, Event, etc.) — consumers seed their own or import a bundle.
- No `ProjectSetupOrchestrator` baked in — the package creates an empty `Project`; what blueprints belong inside it is the consumer's call.
- No tier gates / billing / SaaS infrastructure — those layer on top in your host app.
- No private worldbuilding content from the original Alexandria app.

See [ADR-004](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-004-no-default-content.md) for the rationale.

## Requirements

- PHP 8.4+
- Laravel 13+
- Node 20+ (for the Inertia/React frontend)
- A queue worker (Redis recommended) for AI pipelines
- An AI provider API key (Anthropic, OpenAI, or Google AI) if you want the AI features

## Documentation

- **[`INSTALL.md`](INSTALL.md)** — fresh-environment setup, from `laravel new` through to a running Alexandria install
- **[`CONFIGURATION.md`](CONFIGURATION.md)** — every config key + environment variable, including how the AI architecture keeps the user as the author
- **[`docs/EXTENDING.md`](docs/EXTENDING.md)** — override-points catalog (config publish, model swaps, page overrides, layout hooks, service-provider extension)

This package is the framework half — extension and customization happen in the consumer app. For contributing guidance and AI-assistant instructions, see [`alexandria-app`'s `CONTRIBUTING.md`](https://github.com/lonely-lights/alexandria-app/blob/main/CONTRIBUTING.md) and [`AGENTS.md`](https://github.com/lonely-lights/alexandria-app/blob/main/AGENTS.md). Bug reports and missing extension points belong on this repo's issue tracker; everything else routes through the app.

## Installation (TL;DR)

```bash
composer require lonely-lights/alexandria-core
php artisan vendor:publish --tag=alexandria-config
php artisan migrate
```

For the full walkthrough including frontend Vite/Tailwind wiring, Reverb broadcasting, and queue worker setup, see [`INSTALL.md`](INSTALL.md).

## Sibling packages

Alexandria is designed for a plugin ecosystem. Public siblings under the `Alexandria\` umbrella:

- [`lonely-lights/prosetta`](https://github.com/lonely-lights/prosetta) — Translation management framework.
- `lonely-lights/alexandria-stardate` *(planned)* — Custom calendar / stardate field type as a reference implementation of the field-type registry contract. See [ADR-007](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-007-stardate-as-sibling-plugin.md).

## Architecture decisions

The decisions that shaped this package are recorded as ADRs in the legacy repo for posterity:

- [ADR-001 — Package name and namespace](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-001-package-name-and-namespace.md)
- [ADR-002 — Database table prefix](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-002-database-table-prefix.md)
- [ADR-003 — Frontend asset shipping](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-003-frontend-asset-shipping.md)
- [ADR-004 — No default content](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-004-no-default-content.md)
- [ADR-005 — Auth via service provider](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-005-auth-via-service-provider.md)
- [ADR-006 — Config-driven model resolution](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-006-config-driven-model-resolution.md)
- [ADR-007 — Stardate as sibling plugin](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-007-stardate-as-sibling-plugin.md)
- [ADR-008 — Tier gates stripped](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-008-tier-gates-stripped.md)
- [ADR-009 — Clean-history extraction](https://github.com/lonely-lights/alexandria-legacy/blob/main/docs/adr/ADR-009-clean-history-extraction.md)

## Extending

Every public model is resolved through `config('alexandria.models.*')`. To swap in your own:

```php
// config/alexandria.php
'models' => [
    'project' => \App\Models\MyCustomProject::class,
    // ...
],
```

`docs/EXTENDING.md` (added at Stage 3) documents every override point — model resolution, view registration, field-type registration, AI provider injection.

## Testing

```bash
composer install
vendor/bin/pest
```

The package suite uses Orchestra Testbench so it runs without a host Laravel app.

## Contributing

Contributions welcome once the public API stabilizes around `0.5.0`. Until then, the focus is the initial extraction. See [CONTRIBUTING.md](CONTRIBUTING.md) (added when ready).

## License

MIT — see [LICENSE](LICENSE).

## Credits

Built by [Andrew K. Hartley](https://github.com/andrewkhartley) and friends at [Lonely Lights](https://github.com/lonely-lights). The framework grew out of years of worldbuilding for the [Undaunted](https://undaunted.world) universe.
