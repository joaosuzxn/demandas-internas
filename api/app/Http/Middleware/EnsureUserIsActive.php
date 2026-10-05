<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Usuário desativado com sessão aberta perde o acesso na requisição seguinte.
class EnsureUserIsActive
{
    public function __construct(private readonly AuthService $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            $this->auth->logout($request);

            throw new AuthenticationException;
        }

        return $next($request);
    }
}
