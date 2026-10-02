<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Regra do dono (spec §5.4): com a senha padrão pendente, o sistema inteiro fica bloqueado.
// Só me, me/password e logout saem deste middleware, em routes/api.php.
class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password) {
            return response()->json([
                'message' => __('auth.password_change_required'),
                'code' => 'PASSWORD_CHANGE_REQUIRED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
