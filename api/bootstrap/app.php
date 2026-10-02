<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Erros da API em português e sem detalhes internos (nome de model, classe de exceção).
        $isApi = fn (Request $request) => $request->is('api/*') || $request->expectsJson();

        $exceptions->render(fn (AuthenticationException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => __('http.unauthenticated')], 401)
            : null);

        $exceptions->render(fn (AuthorizationException|AccessDeniedHttpException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => __('http.forbidden')], 403)
            : null);

        // Model não encontrado já chega aqui como NotFoundHttpException.
        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => __('http.not_found')], 404)
            : null);

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($isApi) {
            if (! $isApi($request)) {
                return null;
            }

            $headers = $e->getHeaders();
            // A exceção do login já traz mensagem própria; o throttle do framework vem com a mensagem
            // padrão em inglês ("Too Many Attempts."), que é trocada pela genérica em português.
            $message = ! in_array($e->getMessage(), ['', 'Too Many Attempts.'], true)
                ? $e->getMessage()
                : __('http.too_many_requests', ['seconds' => $headers['Retry-After'] ?? 60]);

            return response()->json(['message' => $message], 429, $headers);
        });
    })->create();

// ADR 0002: as variáveis vêm só do ambiente do container (compose); a API não tem arquivo .env.
// Apontar para /dev/null evita a leitura de um api/.env inexistente a cada boot (aviso nos testes).
$app->useEnvironmentPath('/dev')->loadEnvironmentFrom('null');

return $app;
