<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class UserService
{
    private const PER_PAGE = 20;

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function paginate(?string $search): LengthAwarePaginator
    {
        $term = trim((string) $search);
        // %, _ e \ do termo valem como texto, não como curinga do LIKE.
        $escaped = addcslashes($term, '%_\\');
        $digits = preg_replace('/\D/', '', $term);

        return User::query()
            ->when($term !== '', function (Builder $query) use ($escaped, $digits, $term) {
                $query->where(function (Builder $query) use ($escaped, $digits, $term) {
                    $query->where('name', 'ilike', "%{$escaped}%")
                        ->orWhere('username', 'ilike', "%{$escaped}%")
                        ->orWhere('email', 'ilike', "%{$escaped}%");

                    // Só procura no CPF quando o termo parece um CPF (dígitos, ponto, hífen).
                    if ($digits !== '' && preg_match('/^[\d.\-\s]+$/', $term)) {
                        $query->orWhere('cpf', 'like', "%{$digits}%");
                    }
                });
            })
            ->orderBy('name')
            ->paginate(self::PER_PAGE);
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (UserRules)
     */
    public function create(array $data): User
    {
        $user = new User($data);
        $user->role = Role::Employee;
        $user->password = $this->defaultPassword();
        $user->is_active = true;
        $user->must_change_password = true;
        $user->save();

        return $user;
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (UserRules)
     */
    public function update(User $user, array $data): User
    {
        $user->fill($data)->save();

        return $user;
    }

    public function deactivate(User $user, User $actor): User
    {
        if ($actor->is($user)) {
            throw ValidationException::withMessages(['is_active' => __('users.cannot_deactivate_self')]);
        }

        $user->is_active = false;
        // Mata os cookies de "lembrar": reativada, a pessoa entra de novo com a senha.
        $user->setRememberToken(Str::random(60));
        $user->save();

        return $user;
    }

    public function activate(User $user): User
    {
        $user->is_active = true;
        $user->save();

        return $user;
    }

    // Volta para a senha padrão; a sessão aberta do usuário é encerrada (401 pelo AuthenticateSession do
    // Sanctum) e a pessoa entra de novo com a senha padrão, caindo na troca obrigatória (spec §5.4).
    // Se a redefinição ocorrer entre o login e a requisição seguinte, a resposta é 403 PASSWORD_CHANGE_REQUIRED.
    public function resetPassword(User $user): void
    {
        $user->password = $this->defaultPassword();
        $user->must_change_password = true;
        // Mata os cookies de "lembrar" emitidos com a senha antiga.
        $user->setRememberToken(Str::random(60));
        $user->save();
    }

    private function defaultPassword(): string
    {
        $password = config('auth.default_password');

        if (! is_string($password) || $password === '') {
            throw new RuntimeException('DEFAULT_PASSWORD não está definida no ambiente.');
        }

        return $password;
    }
}
