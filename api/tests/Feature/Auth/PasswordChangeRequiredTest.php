<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordChangeRequiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_blocks_system_until_default_password_is_changed(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create());

        $this->fromSpa()->getJson('/api/dashboard/summary')
            ->assertForbidden()
            ->assertExactJson([
                'message' => 'Troque a senha padrão para continuar.',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
            ]);
    }

    public function test_allows_me_and_logout_while_change_is_pending(): void
    {
        $this->actingAs(User::factory()->mustChangePassword()->create());

        $this->fromSpa()->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true);

        $this->fromSpa()->postJson('/api/logout')->assertNoContent();
    }

    public function test_login_with_default_password_opens_session_but_blocks_system(): void
    {
        User::factory()->mustChangePassword()->create(['email' => 'maria@example.com', 'password' => '123@Senha']);

        $this->fromSpa()->postJson('/api/login', ['login' => 'maria@example.com', 'password' => '123@Senha'])
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true);

        $this->fromSpa()->getJson('/api/dashboard/summary')
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }
}
