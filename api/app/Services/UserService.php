<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use App\Support\Like;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
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
        $pattern = Like::contains($term);
        $digits = preg_replace('/\D/', '', $term);

        return User::query()
            ->when($term !== '', function (Builder $query) use ($pattern, $digits, $term) {
                $query->where(function (Builder $query) use ($pattern, $digits, $term) {
                    $query->where('name', 'ilike', $pattern)
                        ->orWhere('username', 'ilike', $pattern)
                        ->orWhere('email', 'ilike', $pattern);

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
        $this->saveUnique($user);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $data  dados já validados (UserRules)
     */
    public function update(User $user, array $data): User
    {
        $this->saveUnique($user->fill($data));

        return $user;
    }

    public function deactivate(User $user, User $actor): User
    {
        if ($actor->is($user)) {
            throw ValidationException::withMessages(['is_active' => __('users.cannot_deactivate_self')]);
        }

        $user->is_active = false;
        // O User troca o remember_token: reativada, a pessoa entra de novo com a senha.
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
    public function resetPassword(User $user, User $actor): void
    {
        // Na própria conta derrubaria a sessão de quem pediu; a troca é pela tela de senha (como no deactivate).
        if ($actor->is($user)) {
            throw ValidationException::withMessages(['password' => __('users.cannot_reset_own_password')]);
        }

        $user->password = $this->defaultPassword();
        $user->must_change_password = true;
        // O User troca o remember_token: os cookies de "lembrar" da senha antiga deixam de valer.
        $user->save();
    }

    // Dois cadastros iguais ao mesmo tempo passam os dois pelo `unique` do Form Request (UserRules); o segundo
    // bate na constraint do banco e sai como o mesmo 422 da validação, não como 500.
    private function saveUnique(User $user): void
    {
        try {
            // Em transação (savepoint, se já houver uma): no PostgreSQL a violação aborta a transação em volta.
            DB::transaction(fn () => $user->save());
        } catch (UniqueConstraintViolationException $e) {
            $column = collect($e->columns)->first(fn (string $column) => in_array($column, ['username', 'cpf', 'email'], true));
            if ($column === null) {
                throw $e;
            }

            throw ValidationException::withMessages([
                $column => __('validation.unique', ['attribute' => __("validation.attributes.{$column}")]),
            ]);
        }
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
