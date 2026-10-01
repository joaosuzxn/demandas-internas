<?php

namespace App\Http\Requests;

use App\Validation\UserRules;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // a policy é chamada na rota
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        // O unique ignora o próprio registro: manter o CPF e o e-mail atuais é válido.
        return UserRules::rules($this->route('user'));
    }

    protected function prepareForValidation(): void
    {
        $this->replace(UserRules::normalize($this->all()));
    }
}
