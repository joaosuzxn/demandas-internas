<?php

namespace App\Services;

use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\RateLimiter;

// Limite de login (spec §5.1): só tentativas erradas contam. 5 falhas por minuto para o mesmo login + IP,
// e 30 por IP. O teto por IP existe porque a senha padrão é igual para todos (risco aceito, spec §2):
// sem ele, dava para testá-la em muitos usuários diferentes sem nunca bater o limite por login.
class LoginThrottle
{
    private const MAX_PER_LOGIN = 5;

    private const MAX_PER_IP = 30;

    private const DECAY_SECONDS = 60;

    public function ensureNotLimited(string $login, string $ip): void
    {
        $limits = [
            $this->loginKey($login, $ip) => self::MAX_PER_LOGIN,
            $this->ipKey($ip) => self::MAX_PER_IP,
        ];

        $seconds = null;

        foreach ($limits as $key => $max) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $seconds = max($seconds ?? 0, RateLimiter::availableIn($key));
            }
        }

        if ($seconds !== null) {
            throw new ThrottleRequestsException(
                __('auth.throttle', ['seconds' => $seconds]),
                null,
                ['Retry-After' => $seconds],
            );
        }
    }

    public function recordFailure(string $login, string $ip): void
    {
        RateLimiter::hit($this->loginKey($login, $ip), self::DECAY_SECONDS);
        RateLimiter::hit($this->ipKey($ip), self::DECAY_SECONDS);
    }

    // Só a chave por login + IP: a do IP continua contando as falhas.
    public function clear(string $login, string $ip): void
    {
        RateLimiter::clear($this->loginKey($login, $ip));
    }

    private function loginKey(string $login, string $ip): string
    {
        return 'login:'.mb_strtolower(trim($login)).'|'.$ip;
    }

    private function ipKey(string $ip): string
    {
        return 'login-ip:'.$ip;
    }
}
