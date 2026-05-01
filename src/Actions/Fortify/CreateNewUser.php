<?php

declare(strict_types=1);

namespace Alexandria\Core\Actions\Fortify;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): Authenticatable
    {
        $userClass = config('alexandria.models.user');
        $table = (new $userClass)->getTable();

        Validator::make($input, [
            'name' => ['required', 'string', 'min:3', 'max:255', Rule::unique($table)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique($table)],
            'password' => $this->passwordRules(),
        ])->validate();

        return $userClass::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => Hash::make($input['password']),
        ]);
    }
}
