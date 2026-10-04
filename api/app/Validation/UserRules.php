<?php

namespace App\Validation;

use App\Models\User;
use App\Rules\Cpf;
use Illuminate\Validation\Rule;

// Regras de cadastro de usuário, usadas pelos Form Requests e pelo cadastro de usuários.
final class UserRules
{
    /**
     * CPF válido vira só dígitos; e-mail e username viram minúsculas sem espaços, antes da validação.
     * CPF inválido fica como veio: limpar "12345678909abc" o tornaria válido.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalize(array $input): array
    {
        if (isset($input['cpf']) && is_string($input['cpf']) && Cpf::isValid($input['cpf'])) {
            $input['cpf'] = Cpf::normalize($input['cpf']);
        }

        foreach (['email', 'username'] as $field) {
            if (isset($input[$field]) && is_string($input[$field])) {
                $input[$field] = mb_strtolower(trim($input[$field]));
            }
        }

        return $input;
    }

    /**
     * Exige que normalize() tenha rodado antes: a unicidade de e-mail e username depende das minúsculas.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function rules(?User $ignore = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Sem @: é o que separa username de e-mail no campo único de login.
            'username' => ['bail', 'required', 'string', 'regex:/^[a-z0-9._-]{3,30}$/', Rule::unique('users', 'username')->ignore($ignore)],
            'cpf' => ['bail', 'required', 'string', new Cpf, Rule::unique('users', 'cpf')->ignore($ignore)],
            'email' => ['bail', 'required', 'string', 'max:255', 'email:rfc', Rule::unique('users', 'email')->ignore($ignore)],
            // O perfil não vem da API: todo usuário criado por ela é employee.
            'role' => ['prohibited'],
        ];
    }
}
