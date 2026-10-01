<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $login, string $password): TestResponse
    {
        return $this->fromSpa()->postJson('/api/login', ['login' => $login, 'password' => $password]);
    }

    public function test_logs_in_with_valid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        $this->login('maria@example.com', 'Minha@Senha1')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', 'maria@example.com')
            ->assertJsonPath('data.must_change_password', false)
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_logs_in_with_username(): void
    {
        $user = User::factory()->create(['username' => 'maria.souza', 'password' => 'Minha@Senha1']);

        $this->login('maria.souza', 'Minha@Senha1')
            ->assertOk()
            ->assertJsonPath('data.username', 'maria.souza');

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_login_is_case_insensitive(): void
    {
        $user = User::factory()->create([
            'username' => 'maria.souza',
            'email' => 'maria@example.com',
            'password' => 'Minha@Senha1',
        ]);

        $this->login(' MARIA@Example.com ', 'Minha@Senha1')->assertOk();
        $this->login(' Maria.Souza ', 'Minha@Senha1')->assertOk();

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_email_is_not_matched_as_username(): void
    {
        // Sem @ procura só no username: o trecho antes do @ de um e-mail não serve de login.
        User::factory()->create(['username' => 'user1', 'email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        $this->login('maria', 'Minha@Senha1')
            ->assertJsonValidationErrors(['login' => 'Credenciais inválidas.']);
    }

    public function test_login_with_default_password_reports_pending_change(): void
    {
        User::factory()->mustChangePassword()->create(['email' => 'maria@example.com', 'password' => '123@Senha']);

        $this->login('maria@example.com', '123@Senha')
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true);
    }

    public function test_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        $this->login('maria@example.com', 'errada')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login' => 'Credenciais inválidas.']);

        $this->assertGuest('web');
    }

    public function test_rejects_unknown_email_with_same_message(): void
    {
        $this->login('ninguem@example.com', 'Minha@Senha1')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login' => 'Credenciais inválidas.']);
    }

    public function test_rejects_inactive_user_with_correct_password(): void
    {
        User::factory()->inactive()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        $this->login('maria@example.com', 'Minha@Senha1')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login' => 'Conta desativada. Procure o administrador.']);

        $this->assertGuest('web');
    }

    public function test_inactive_user_with_wrong_password_gets_generic_message(): void
    {
        User::factory()->inactive()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        $this->login('maria@example.com', 'errada')
            ->assertJsonValidationErrors(['login' => 'Credenciais inválidas.']);
    }

    public function test_throttles_after_five_attempts(): void
    {
        User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        foreach (range(1, 5) as $attempt) {
            $this->login('maria@example.com', 'errada')->assertUnprocessable();
        }

        $this->login('maria@example.com', 'Minha@Senha1')->assertTooManyRequests();
    }

    public function test_throttle_message_is_in_portuguese_with_retry_after(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->login('maria@example.com', 'errada')->assertUnprocessable();
        }

        $response = $this->login('maria@example.com', 'errada')->assertTooManyRequests();

        $this->assertMatchesRegularExpression(
            '/^Muitas tentativas de login\. Tente novamente em \d+ segundos\.$/',
            $response->json('message'),
        );
        $this->assertGreaterThan(0, (int) $response->headers->get('Retry-After'));
    }

    public function test_successful_logins_do_not_count_toward_the_limit(): void
    {
        User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        foreach (range(1, 10) as $attempt) {
            $this->login('maria@example.com', 'Minha@Senha1')->assertOk();
        }
    }

    public function test_successful_login_resets_the_login_counter(): void
    {
        User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        foreach (range(1, 4) as $attempt) {
            $this->login('maria@example.com', 'errada')->assertUnprocessable();
        }
        $this->login('maria@example.com', 'Minha@Senha1')->assertOk();
        foreach (range(1, 4) as $attempt) {
            $this->login('maria@example.com', 'errada')->assertUnprocessable();
        }

        $this->login('maria@example.com', 'errada')->assertUnprocessable();
    }

    public function test_inactive_account_attempts_count_as_failures(): void
    {
        User::factory()->inactive()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);

        foreach (range(1, 5) as $attempt) {
            $this->login('maria@example.com', 'Minha@Senha1')->assertUnprocessable();
        }

        $this->login('maria@example.com', 'Minha@Senha1')->assertTooManyRequests();
    }

    public function test_unknown_user_still_runs_a_password_hash_check(): void
    {
        // partialMock: o make() continua real, senão um hash falso ficaria no estático do AuthService.
        $hasher = \Mockery::mock(Hash::getFacadeRoot())->makePartial();
        $hasher->shouldReceive('check')->once()->andReturn(false);
        Hash::swap($hasher);

        $this->login('ninguem@example.com', 'Minha@Senha1')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login' => 'Credenciais inválidas.']);
    }

    public function test_rejects_password_over_255_characters(): void
    {
        $this->login('maria@example.com', str_repeat('a', 256))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_throttles_spraying_across_different_logins_from_same_ip(): void
    {
        foreach (range(1, 30) as $attempt) {
            $this->login("ninguem{$attempt}@example.com", '123@Senha')->assertUnprocessable();
        }

        $this->login('outro@example.com', '123@Senha')->assertTooManyRequests();
    }

    public function test_login_as_array_is_a_validation_error(): void
    {
        $this->fromSpa()->postJson('/api/login', ['login' => ['a'], 'password' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login']);
    }

    public function test_requires_login_and_password(): void
    {
        $this->fromSpa()->postJson('/api/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['login', 'password']);
    }

    public function test_logout_ends_session(): void
    {
        User::factory()->create(['email' => 'maria@example.com', 'password' => 'Minha@Senha1']);
        $this->login('maria@example.com', 'Minha@Senha1')->assertOk();

        $this->fromSpa()->postJson('/api/logout')->assertNoContent();
        // Requisição nova: a sessão não pode mais carregar o usuário.
        $this->app['auth']->forgetGuards();

        $this->fromSpa()->getJson('/api/me')->assertUnauthorized();
        $this->assertGuest('web');
    }

    public function test_me_requires_authentication(): void
    {
        $this->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_returns_current_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->fromSpa()->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.cpf', $user->cpf)
            ->assertJsonPath('data.role', 'employee')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonMissingPath('data.password');
    }

    public function test_skeleton_user_route_is_gone(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->getJson('/api/user')->assertNotFound();
    }
}
