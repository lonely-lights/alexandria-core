<?php

declare(strict_types=1);

namespace Alexandria\Core\Actions\Fortify;

use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    /**
     * Password rules used by the Fortify Action classes.
     *
     * @return array<int, mixed>
     */
    protected function passwordRules(): array
    {
        return ['required', 'string', Password::default(), 'confirmed'];
    }
}
