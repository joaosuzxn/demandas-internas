<?php

namespace Tests\Feature\Profile;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    private function change(array $payload): TestResponse
    {
        return $this->fromSpa()->putJson('/api/me/password', $payload);
    }

    public function test_changes_default_password_and_releases_access_without_new_login(): void
    {
        $user = User::factory()->mustChangePassword()->create(['password' => '123@Senha']);
        // Autentica pela sessão (não por actingAs) para provar a liberação contra o estado do banco.
        $this->withSession([Auth::guard('web')->getName() => $user->id]);

        $this->change([
            'current_password' => '123@Senha',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertNoContent();

        $fresh = $user->fresh();
        $this->assertFalse($fresh->must_change_password);
        $this->assertTrue(Hash::check('Nova@Senha1', $fresh->password));

        // Descarta o usuário em memória: a próxima requisição relê o banco.
        $this->app['auth']->forgetGuards();

        // Liberado na mesma sessão, sem novo login.
        $this->fromSpa()->getJson('/api/dashboard/summary')->assertOk();
    }

    public function test_login_works_with_new_password(): void
    {
        $user = User::factory()->mustChangePassword()->create(['email' => 'maria@example.com', 'password' => '123@Senha']);
        $this->actingAs($user);
        $this->change([
            'current_password' => '123@Senha',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertNoContent();

        $this->fromSpa()->postJson('/api/login', ['login' => 'maria@example.com', 'password' => 'Nova@Senha1'])
            ->assertOk()
            ->assertJsonPath('data.must_change_password', false);
    }

    public function test_rejects_wrong_current_password(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create(['password' => '123@Senha']));

        $this->change([
            'current_password' => 'errada',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'A senha atual está incorreta.']);
    }

    public function test_rejects_weak_passwords(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create(['password' => '123@Senha']));

        // Cada uma falha num critério: tamanho, maiúscula, símbolo, número, letras.
        foreach (['N@1a', 'nova@senha1', 'NovaSenha1', 'Nova@Senha', '12345678@'] as $weak) {
            $this->change([
                'current_password' => '123@Senha',
                'password' => $weak,
                'password_confirmation' => $weak,
            ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
        }
    }

    public function test_rejects_new_password_over_72_characters(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create(['password' => '123@Senha']));
        $long = 'Nova@Senha1'.str_repeat('a', 62);

        $this->change([
            'current_password' => '123@Senha',
            'password' => $long,
            'password_confirmation' => $long,
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
    }

    public function test_throttles_password_change_attempts(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create(['password' => '123@Senha']));
        $payload = ['current_password' => 'errada', 'password' => 'Nova@Senha1', 'password_confirmation' => 'Nova@Senha1'];

        foreach (range(1, 5) as $attempt) {
            $this->change($payload)->assertUnprocessable();
        }

        $this->change($payload)->assertTooManyRequests();
    }

    public function test_rejects_missing_confirmation(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create(['password' => '123@Senha']));

        $this->change(['current_password' => '123@Senha', 'password' => 'Nova@Senha1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_rejects_default_password_as_new_password(): void
    {
        $this->actingAs(User::factory()->create(['password' => 'Minha@Senha1']));

        $this->change([
            'current_password' => 'Minha@Senha1',
            'password' => '123@Senha',
            'password_confirmation' => '123@Senha',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A nova senha não pode ser igual à senha padrão.']);
    }
}
