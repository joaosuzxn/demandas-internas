<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Tests\TestCase;

class RememberMeTest extends TestCase
{
    use RefreshDatabase;

    private function recallerName(): string
    {
        return Auth::guard('web')->getRecallerName();
    }

    // Faz o login marcando "Lembrar-me" e devolve o valor (já decifrado) do cookie de lembrar.
    private function loginRemembered(User $user, string $password = 'Minha@Senha1'): string
    {
        $response = $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => $password, 'remember' => true])
            ->assertOk();

        return $response->getCookie($this->recallerName())->getValue();
    }

    // Simula o navegador voltando depois de a sessão expirar: sem sessão, sem usuário em memória
    // e só com o cookie de lembrar informado (ou nenhum). O withCredentials() é necessário: requisições JSON de teste
    // só enviam cookies com ele.
    private function asReturningBrowser(?string $recaller): static
    {
        $this->flushSession();
        Cookie::flushQueuedCookies();
        $this->app['auth']->forgetGuards();
        $this->defaultCookies = [];

        return $recaller === null ? $this : $this->withCredentials()->withCookie($this->recallerName(), $recaller);
    }

    public function test_login_with_remember_sets_the_recaller_cookie(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => 'Minha@Senha1', 'remember' => true])
            ->assertOk()
            ->assertCookie($this->recallerName());

        $this->assertNotNull($user->fresh()->remember_token);
    }

    public function test_recaller_cookie_lasts_400_days(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $response = $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => 'Minha@Senha1', 'remember' => true]);

        // Padrão do Laravel (SessionGuard::$rememberDuration = 576000 minutos), decisão do dono.
        $this->assertEqualsWithDelta(
            now()->addDays(400)->getTimestamp(),
            $response->getCookie($this->recallerName())->getExpiresTime(),
            5,
        );
    }

    public function test_login_without_remember_sets_no_recaller_cookie(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => 'Minha@Senha1'])
            ->assertOk()
            ->assertCookieMissing($this->recallerName());

        $this->assertNull($user->fresh()->remember_token);
    }

    public function test_login_with_remember_false_sets_no_recaller_cookie(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => 'Minha@Senha1', 'remember' => false])
            ->assertOk()
            ->assertCookieMissing($this->recallerName());
    }

    public function test_rejects_non_boolean_remember(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => 'Minha@Senha1', 'remember' => 'sim'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['remember' => 'O campo lembrar-me deve ser verdadeiro ou falso.']);

        $this->assertGuest('web');
    }

    public function test_recaller_cookie_alone_restores_the_session(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $recaller = $this->loginRemembered($user);

        $this->asReturningBrowser($recaller)->fromSpa()->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    // Controle do teste acima: sem o cookie, o mesmo "navegador que volta" não está logado.
    public function test_returning_browser_without_the_cookie_is_a_guest(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $this->loginRemembered($user);

        $this->asReturningBrowser(null)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_remembered_user_with_pending_password_change_is_still_blocked(): void
    {
        $user = User::factory()->mustChangePassword()->create(['password' => '123@Senha']);
        $recaller = $this->loginRemembered($user, '123@Senha');

        $this->asReturningBrowser($recaller)->fromSpa()->getJson('/api/dashboard/summary')
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }

    public function test_logout_invalidates_the_recaller_cookie(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $recaller = $this->loginRemembered($user);

        $this->fromSpa()->postJson('/api/logout')->assertNoContent();

        $this->asReturningBrowser($recaller)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_remember_token_never_appears_in_json(): void
    {
        $admin = User::factory()->admin()->create(['password' => 'Minha@Senha1']);

        $this->fromSpa()
            ->postJson('/api/login', ['login' => $admin->email, 'password' => 'Minha@Senha1', 'remember' => true])
            ->assertOk()
            ->assertJsonMissingPath('data.remember_token');

        $this->fromSpa()->getJson('/api/me')->assertOk()->assertJsonMissingPath('data.remember_token');
        $this->fromSpa()->getJson('/api/users')->assertOk()->assertJsonMissingPath('data.0.remember_token');

        $this->assertArrayNotHasKey('remember_token', $admin->fresh()->toArray());
    }

    public function test_admin_password_reset_invalidates_the_recaller_cookie(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $recaller = $this->loginRemembered($user);
        $tokenBefore = $user->fresh()->remember_token;

        $this->asReturningBrowser(null)->actingAs($admin);
        $this->fromSpa()->postJson("/api/users/{$user->id}/reset-password")->assertNoContent();

        $this->assertNotSame($tokenBefore, $user->fresh()->remember_token);
        $this->asReturningBrowser($recaller)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_deactivation_invalidates_the_recaller_cookie_even_after_reactivation(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $recaller = $this->loginRemembered($user);

        $this->asReturningBrowser(null)->actingAs($admin);
        $this->fromSpa()->postJson("/api/users/{$user->id}/deactivate")->assertOk();
        $this->fromSpa()->postJson("/api/users/{$user->id}/activate")->assertOk();

        // Reativado, o usuário precisa entrar de novo: o cookie antigo não reabre a sessão.
        $this->asReturningBrowser($recaller)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_changing_own_password_invalidates_other_devices_recaller_cookies(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $otherDevice = $this->loginRemembered($user);

        // Este aparelho tem sessão, mas não está lembrado.
        $this->asReturningBrowser(null)->withSession([Auth::guard('web')->getName() => $user->id]);
        $this->fromSpa()->putJson('/api/me/password', [
            'current_password' => 'Minha@Senha1',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertNoContent()->assertCookieMissing($this->recallerName());

        $this->asReturningBrowser($otherDevice)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    public function test_changing_own_password_keeps_the_current_device_remembered(): void
    {
        $user = User::factory()->mustChangePassword()->create(['password' => '123@Senha']);
        $old = $this->loginRemembered($user, '123@Senha');
        Cookie::flushQueuedCookies();

        $response = $this->withCredentials()->withCookie($this->recallerName(), $old)->fromSpa()->putJson('/api/me/password', [
            'current_password' => '123@Senha',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertNoContent();

        $new = $response->getCookie($this->recallerName())?->getValue();
        $this->assertNotNull($new);
        $this->assertNotSame($old, $new);

        $this->asReturningBrowser($new)->fromSpa()->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.must_change_password', false);
        $this->asReturningBrowser($old)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }

    // Cookie velho esquecido no navegador não pode transformar um login "sem lembrar" em lembrado.
    public function test_stale_recaller_cookie_is_not_reissued_on_password_change(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['password' => 'Minha@Senha1']);
        $stale = $this->loginRemembered($user);

        $this->asReturningBrowser(null)->actingAs($admin);
        $this->fromSpa()->postJson("/api/users/{$user->id}/reset-password")->assertNoContent();

        // O usuário volta com o cookie velho, entra com a senha padrão SEM marcar "Lembrar-me" e troca a senha.
        $this->asReturningBrowser($stale)->fromSpa()
            ->postJson('/api/login', ['login' => $user->email, 'password' => '123@Senha'])
            ->assertOk();
        $this->fromSpa()->putJson('/api/me/password', [
            'current_password' => '123@Senha',
            'password' => 'Nova@Senha1',
            'password_confirmation' => 'Nova@Senha1',
        ])->assertNoContent()->assertCookieMissing($this->recallerName());

        $this->asReturningBrowser($stale)->fromSpa()->getJson('/api/me')->assertUnauthorized();
    }
}
