<?php

namespace Tests\Feature\Auth;

use App\Http\Middleware\EnsurePasswordIsChanged;
use Illuminate\Auth\Middleware\Authenticate;
use Tests\TestCase;

// Guarda da regra do dono (spec §5.4): toda rota autenticada nasce bloqueada enquanto a senha padrão
// não for trocada. Se este teste falhar, uma rota nova ficou fora do bloqueio.
class PasswordChangeGuardTest extends TestCase
{
    private const ALLOWED_WHILE_PENDING = ['me', 'me.password', 'logout'];

    public function test_every_authenticated_route_requires_changed_password(): void
    {
        $router = $this->app['router'];
        $checked = [];

        foreach ($router->getRoutes() as $route) {
            $middleware = $router->gatherRouteMiddleware($route);
            $authenticated = collect($middleware)->contains(
                fn ($name) => is_string($name) && str_starts_with($name, Authenticate::class)
            );

            if (! $authenticated) {
                continue;
            }

            $checked[] = $route->getName();
            $guarded = in_array(EnsurePasswordIsChanged::class, $middleware, true);

            if (in_array($route->getName(), self::ALLOWED_WHILE_PENDING, true)) {
                $this->assertFalse($guarded, "A rota {$route->uri()} deveria estar liberada com a senha pendente.");
            } else {
                $this->assertTrue($guarded, "A rota {$route->uri()} não exige a troca da senha padrão.");
            }
        }

        foreach (self::ALLOWED_WHILE_PENDING as $name) {
            $this->assertContains($name, $checked, "A rota liberada {$name} não existe ou não é autenticada.");
        }
        $this->assertContains('dashboard.summary', $checked);
    }
}
