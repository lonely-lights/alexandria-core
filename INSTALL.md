# Installing Alexandria Core

This guide takes a blank Laravel 13 application and gets a working Alexandria install on top of it. If you already have an existing Laravel app, skip Section 1 and start at Section 2.

For ongoing customization once installed, see [`docs/EXTENDING.md`](docs/EXTENDING.md).
For environment variables and config keys, see [`CONFIGURATION.md`](CONFIGURATION.md).

---

## Requirements

- PHP 8.4 or newer
- Composer 2.x
- Node 20 or newer
- A queue worker (Redis recommended; database driver works for development)
- PostgreSQL 16+ or MySQL 8+ (PostgreSQL is what the package is developed against)
- An AI provider API key if you want the AI features — Anthropic, OpenAI, or Google AI. Optional; the EAV/notes/views surface works without it.

---

## 1. Start a fresh Laravel app

```bash
laravel new my-alexandria
cd my-alexandria
```

Configure your `.env` for your database. Test that `php artisan migrate` succeeds against an empty database before continuing.

---

## 2. Install the package

While `alexandria-core` is in pre-release (`0.x`), install via Composer's path repository pointing at a local clone. Once `v0.1.0` ships to Packagist this becomes a one-liner.

**Path repo (current):**

```bash
git clone https://github.com/lonely-lights/alexandria-core ../alexandria-core
```

In your app's `composer.json`:

```json
{
    "repositories": [
        { "type": "path", "url": "../alexandria-core" }
    ],
    "require": {
        "lonely-lights/alexandria-core": "*"
    }
}
```

Then:

```bash
composer update lonely-lights/alexandria-core
```

**Packagist (planned, post-`v0.1.0`):**

```bash
composer require lonely-lights/alexandria-core
```

---

## 3. Publish the config

```bash
php artisan vendor:publish --tag=alexandria-config
```

This drops `config/alexandria.php` into your app. The defaults work out of the box; tweak only when you want to override something. Full key reference in [`CONFIGURATION.md`](CONFIGURATION.md).

---

## 4. Run migrations

```bash
php artisan migrate
```

Core ships migrations for the EAV stack (`projects`, `blueprints`, `blueprint_fields`, `entries`, `field_values`, `entry_relationships`), AI tables (`ai_providers`, `ai_models`, `ai_transactions`, `ai_review_commands`), notes (`notes`, `notebooks`, `notables`), Spatie permissions / activity log / tags, Sanctum personal access tokens, and Fortify's two-factor columns.

---

## 5. Frontend setup (Vite + React + Tailwind 4)

Install the JS dependencies you need on top of Laravel's defaults:

```bash
npm install --save \
    @inertiajs/react \
    react react-dom \
    laravel-echo pusher-js \
    daisyui@5 tailwindcss@4
```

Wire the path alias so your bundle pulls React components straight from the package's `vendor/` directory:

```ts
// vite.config.ts
import { resolve } from 'path';
export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
            '@alexandria': resolve(__dirname, 'vendor/lonely-lights/alexandria-core/resources/js'),
        },
    },
});
```

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./resources/js/*"],
            "@alexandria/*": ["./vendor/lonely-lights/alexandria-core/resources/js/*"]
        }
    }
}
```

```css
/* resources/css/app.css */
@source '../../vendor/lonely-lights/alexandria-core/resources/js/**/*.{ts,tsx}';
```

Update `resources/js/app.tsx` to resolve pages from both locations (consumer first, then core fallback):

```ts
const localPages = import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx');
const corePages  = import.meta.glob<{ default: ResolvedComponent }>(
    '../../vendor/lonely-lights/alexandria-core/resources/js/pages/**/*.tsx',
);

void createInertiaApp({
    resolve: (name) => {
        const localKey = `./pages/${name}.tsx`;
        const coreKey  = `../../vendor/lonely-lights/alexandria-core/resources/js/pages/${name}.tsx`;
        const importer = localPages[localKey] ?? corePages[coreKey];
        if (!importer) throw new Error(`Page not found: ${name}`);
        return importer().then(m => m.default);
    },
    // ...rest of standard Inertia config
});
```

Build:

```bash
npm run dev
```

---

## 6. Echo + Reverb (real-time AI status updates)

The AI pipeline broadcasts processing state to the user's browser via Laravel Echo + Reverb. Install Reverb:

```bash
composer require laravel/reverb
```

Add to `.env` (Herd ships a built-in Reverb at `reverb-8080.herd.test` if you're on Herd):

```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=reverb-8080.herd.test
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

Add the user channel authorization to `routes/channels.php`:

```php
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
```

Initialize Echo in `resources/js/echo.ts`:

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
        },
    },
});
```

Import it from `app.tsx`:

```ts
import './echo';
```

Skip this section if you don't need real-time AI status updates.

---

## 7. Queue worker

Project sorting + entry integration run on the queue:

```bash
php artisan queue:work
```

For development it's fine to run in a terminal; for production use Supervisor or Horizon.

---

## 8. (Optional) AI provider setup

Configure your default provider via the env. See [`CONFIGURATION.md`](CONFIGURATION.md) for the BYOK-vs-env-fallback distinction and the per-user API-key flow.

```env
ANTHROPIC_API_KEY=sk-ant-...
# or:
OPENAI_API_KEY=sk-...
# or:
GOOGLE_AI_API_KEY=...
```

---

## 9. Verify

```bash
php artisan serve
```

Visit `http://127.0.0.1:8000/login`. You should see the Alexandria-styled Fortify login page rendered through Inertia. Register an account, create a project, and you're in.

---

## Common issues

- **`Route [account] not defined`** — your app needs a route named `account.show`. Core's auth flow assumes the consumer wires its own settings page; see [`docs/EXTENDING.md`](docs/EXTENDING.md) Section 3 for the pattern.
- **Vite build error: missing manifest** — run `npm run build` (production) or `npm run dev` (development) before booting the server.
- **CSRF token mismatch on POST** — ensure your blade layout includes `<meta name="csrf-token" content="{{ csrf_token() }}">` in the `<head>`.
- **Reverb connection failures** — confirm `BROADCAST_CONNECTION=reverb` and that `REVERB_*` env values match your Reverb server's app credentials. Duplicate `REVERB_*` blocks in `.env` cause silent overrides; keep only one set.

If something else breaks, file an issue at [github.com/lonely-lights/alexandria-core/issues](https://github.com/lonely-lights/alexandria-core/issues) — fresh-install bug reports are gold while we're shaking out the package contracts.
