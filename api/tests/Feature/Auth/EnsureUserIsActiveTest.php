<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class EnsureUserIsActiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_deactivated_user_loses_session_on_next_request(): void
    {
        $user = User::factory()->create();
        // Sessão de verdade (sem actingAs), para a próxima requisição recarregar o usuário do banco.
        $this->withSession([Auth::guard('web')->getName() => $user->id]);
        $this->fromSpa()->getJson('/api/me')->assertOk();

        // O administrador desativa o usuário direto no banco, sem tocar na instância em memória.
        User::whereKey($user->id)->update(['is_active' => false]);
        // Simula uma requisição nova: o guard esquece o usuário já carregado.
        $this->app['auth']->forgetGuards();

        $this->fromSpa()->getJson('/api/me')->assertUnauthorized();
        $this->assertGuest('web');
    }
}
