<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    // Hash fictício gerado uma vez por processo, com o custo configurado (BCRYPT_ROUNDS).
    private static ?string $dummyHash = null;

    public function __construct(private readonly LoginThrottle $throttle) {}

    // $login já vem normalizado (minúsculas, sem espaços): com @ é e-mail, sem @ é username.
    public function login(string $login, string $password, string $ip): User
    {
        $this->throttle->ensureNotLimited($login, $ip);

        $column = str_contains($login, '@') ? 'email' : 'username';
        $user = User::where($column, $login)->first();

        // Usuário inexistente também gasta um Hash::check, para o tempo de resposta não revelar quem tem conta.
        $passwordMatches = Hash::check($password, $user->password ?? (self::$dummyHash ??= Hash::make('dummy-password')));

        // Usuário inexistente e senha errada dão a mesma mensagem, para não revelar quem tem conta.
        if (! $user || ! $passwordMatches) {
            $this->throttle->recordFailure($login, $ip);

            throw ValidationException::withMessages(['login' => __('auth.failed')]);
        }

        if (! $user->is_active) {
            $this->throttle->recordFailure($login, $ip);

            throw ValidationException::withMessages(['login' => __('auth.inactive')]);
        }

        $this->throttle->clear($login, $ip);
        Auth::guard('web')->login($user);

        return $user;
    }

    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}
