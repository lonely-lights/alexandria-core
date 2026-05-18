<?php

declare(strict_types=1);

namespace Alexandria\Core\Actions\Fortify;

use Alexandria\Core\Models\InstanceSettings;
use Alexandria\Core\Services\Registration\InviteTokenService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Throwable;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * Stage 8c.E.4 — when `instance_settings.open_registration` is
     * off, an `invite_token` field is required and must validate
     * against an unexpired, non-exhausted row in `invite_tokens`.
     * The token is consumed (uses_count++) atomically inside the
     * service so concurrent registrations can't double-spend the
     * last use of a single-use code.
     *
     * @param  array<string, string>  $input
     *
     * @throws Throwable
     */
    public function create(array $input): Authenticatable
    {
        $userClass = config('alexandria.models.user');
        $table = (new $userClass)->getTable();

        $rules = [
            'name' => ['required', 'string', 'min:3', 'max:255', Rule::unique($table)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique($table)],
            'password' => $this->passwordRules(),
        ];

        $registrationOpen = $this->isRegistrationOpen();
        if (! $registrationOpen) {
            $rules['invite_token'] = ['required', 'string', 'size:12'];
        }

        Validator::make($input, $rules)->validate();

        // Token consumption happens BEFORE user creation. If the
        // token is bad we want to fail fast without leaving a half-
        // registered user in the table. If user creation later
        // fails for some other reason, the token use is already
        // decremented — that's acceptable; tokens are cheap to
        // re-mint.
        if (! $registrationOpen) {
            try {
                app(InviteTokenService::class)->consume($input['invite_token']);
            } catch (InvalidArgumentException $e) {
                throw ValidationException::withMessages([
                    'invite_token' => [$e->getMessage()],
                ]);
            }
        }

        return $userClass::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => Hash::make($input['password']),
        ]);
    }

    /**
     * Read the open_registration toggle. Falls back to true if the
     * instance_settings table doesn't exist yet (fresh install
     * pre-migration), so the registration flow never wedges itself
     * shut due to missing infrastructure.
     */
    protected function isRegistrationOpen(): bool
    {
        try {
            return (bool) InstanceSettings::instance()->open_registration;
        } catch (Throwable) {
            return true;
        }
    }
}
