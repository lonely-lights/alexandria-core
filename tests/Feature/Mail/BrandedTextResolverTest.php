<?php

declare(strict_types=1);

use Alexandria\Core\Mail\BrandedTextResolver;
use Alexandria\Core\Mail\VerifyEmailMail;
use Alexandria\Core\Models\EmailOverride;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Route;

uses(RefreshDatabase::class);

beforeEach(function () {
    Route::get('/email/verify/{id}/{hash}', fn () => 'ok')->name('verification.verify');
    Route::get('/password/reset/{token}', fn () => 'ok')->name('password.reset');
});

it('falls back to file lang when no DB override exists', function () {
    $value = app(BrandedTextResolver::class)->get('verify', 'subject');

    expect($value)->toBe(__('alexandria::emails.verify.subject'));
});

it('resolves app-supplied lang for slugs core does not ship', function () {
    // Consumer apps register their own branded mails (store receipts,
    // saas invites) with strings in their own lang/<locale>/emails.php.
    Lang::addLines(['emails.app-receipt.subject' => 'Your receipt'], 'en');

    $value = app(BrandedTextResolver::class)->get('app-receipt', 'subject');

    expect($value)->toBe('Your receipt');
});

it('lets app lang keys win over core file lang (loadGroup precedence)', function () {
    Lang::addLines(['emails.verify.subject' => 'App-flavored verify subject'], 'en');

    $value = app(BrandedTextResolver::class)->get('verify', 'subject');

    expect($value)->toBe('App-flavored verify subject');
});

it('still prefers DB overrides over app-supplied lang', function () {
    Lang::addLines(['emails.verify.subject' => 'App-flavored verify subject'], 'en');
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'DB override wins',
        'locale' => 'en',
    ]);

    $value = app(BrandedTextResolver::class)->get('verify', 'subject');

    expect($value)->toBe('DB override wins');
});

it('returns the DB override when one exists for that mail+key+locale', function () {
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'Custom — please confirm your email',
        'locale' => 'en',
    ]);

    $value = app(BrandedTextResolver::class)->get('verify', 'subject');

    expect($value)->toBe('Custom — please confirm your email');
});

it('respects locale when resolving overrides', function () {
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'English override',
        'locale' => 'en',
    ]);
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'Override en français',
        'locale' => 'fr',
    ]);

    $en = app(BrandedTextResolver::class)->get('verify', 'subject', [], 'en');
    $fr = app(BrandedTextResolver::class)->get('verify', 'subject', [], 'fr');

    expect($en)->toBe('English override');
    expect($fr)->toBe('Override en français');
});

it('interpolates :placeholder tokens in DB override content', function () {
    EmailOverride::factory()->forReset('greeting')->create([
        'content' => 'Hi :name, ready to reset?',
    ]);

    $value = app(BrandedTextResolver::class)->get('reset', 'greeting', ['name' => 'Jane']);

    expect($value)->toBe('Hi Jane, ready to reset?');
});

it('handles compound slug.key form via getFromCompound', function () {
    EmailOverride::factory()->forVerify('intro')->create([
        'content' => 'Welcome to the library',
    ]);

    $value = app(BrandedTextResolver::class)->getFromCompound('verify.intro');

    expect($value)->toBe('Welcome to the library');
});

it('uses the override in the rendered email subject', function () {
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'Confirm your address',
    ]);

    $subject = VerifyEmailMail::preview()->envelope()->subject;

    expect($subject)->toBe('Confirm your address');
});

it('uses the override in the rendered email body via @brandedString', function () {
    EmailOverride::factory()->forVerify('intro')->create([
        'content' => 'Override intro text — DB-backed.',
    ]);

    $html = VerifyEmailMail::preview()->render();

    expect($html)->toContain('Override intro text — DB-backed.');
});

it('respects the unique constraint on (mail_slug, lang_key, locale)', function () {
    EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'First',
        'locale' => 'en',
    ]);

    expect(fn () => EmailOverride::factory()->forVerify('subject')->create([
        'content' => 'Duplicate',
        'locale' => 'en',
    ]))->toThrow(Exception::class);
});

it('binds BrandedTextResolver as a singleton', function () {
    $a = app(BrandedTextResolver::class);
    $b = app(BrandedTextResolver::class);

    expect($a)->toBe($b);
});
