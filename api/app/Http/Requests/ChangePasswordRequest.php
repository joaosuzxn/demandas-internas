<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => [
                'required',
                'string',
                // O bcrypt ignora o que passa de 72 bytes.
                'max:72',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
                // A nova senha não pode voltar a ser a padrão, que todos conhecem.
                Rule::notIn([config('auth.default_password')]),
            ],
        ];
    }
}
