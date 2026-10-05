<?php

namespace Tests\Feature\Users;

use App\Enums\Role;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\Support\FictitiousCpf;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create(['name' => 'Admin Principal']);
    }

    private function asAdmin(): static
    {
        $this->actingAs($this->admin);

        return $this->fromSpa();
    }

    private function validPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Maria Souza',
            'username' => 'maria.souza',
            'cpf' => FictitiousCpf::DEFAULT_MASKED,
            'email' => 'maria@example.com',
        ], $overrides);
    }

    public function test_employee_is_forbidden_on_every_user_route(): void
    {
        $target = User::factory()->create();
        $this->actingAs(User::factory()->create());

        $requests = [
            ['GET', '/api/users'],
            ['POST', '/api/users'],
            ['GET', "/api/users/{$target->id}"],
            ['PUT', "/api/users/{$target->id}"],
            ['POST', "/api/users/{$target->id}/deactivate"],
            ['POST', "/api/users/{$target->id}/activate"],
            ['POST', "/api/users/{$target->id}/reset-password"],
        ];

        // Payload válido: o 403 tem de vir da policy, não de uma falha de validação.
        foreach ($requests as [$method, $uri]) {
            $this->fromSpa()->json($method, $uri, $this->validPayload())->assertForbidden();
        }
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/users')->assertUnauthorized();
    }

    public function test_admin_with_pending_password_change_cannot_manage_users(): void
    {
        $this->admin->must_change_password = true;
        $this->admin->save();

        $this->asAdmin()->getJson('/api/users')
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }

    public function test_lists_users_paginated_and_ordered_by_name(): void
    {
        // Nomes com ordem igual em qualquer collation, criados fora de ordem.
        foreach (collect(range(1, 24))->shuffle() as $i) {
            User::factory()->create(['name' => sprintf('Usuario %02d', $i)]);
        }

        $this->asAdmin()->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 25)
            ->assertJsonPath('data.0.name', 'Admin Principal')
            ->assertJsonPath('data.1.name', 'Usuario 01')
            ->assertJsonPath('data.19.name', 'Usuario 19')
            ->assertJsonMissingPath('data.0.password');

        $this->asAdmin()->getJson('/api/users?page=2')
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.name', 'Usuario 20');
    }

    public function test_searches_by_name_username_email_and_cpf(): void
    {
        $maria = User::factory()->create(['name' => 'Maria Souza', 'username' => 'msouza', 'email' => 'maria@example.com', 'cpf' => FictitiousCpf::DEFAULT]);
        $joao = User::factory()->create(['name' => 'João Lima', 'username' => 'jlima', 'email' => 'joao@example.com', 'cpf' => FictitiousCpf::SECOND]);

        $cases = [
            'souza' => $maria,
            'JLIMA' => $joao,
            'JOAO@' => $joao,
            FictitiousCpf::DEFAULT_MASKED => $maria,
            FictitiousCpf::SECOND => $joao,
        ];

        foreach ($cases as $search => $expected) {
            $this->asAdmin()->getJson('/api/users?search='.urlencode($search))
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $expected->id);
        }
    }

    public function test_search_treats_wildcards_and_symbols_literally(): void
    {
        $this->admin->update(['email' => 'admin@example.com']);
        User::factory()->create(['name' => 'Maria Souza', 'username' => 'msouza', 'email' => 'maria@example.com', 'cpf' => FictitiousCpf::DEFAULT]);
        User::factory()->create(['name' => 'Joao Lima', 'username' => 'joao', 'email' => 'joao@example.com', 'cpf' => FictitiousCpf::SECOND]);

        foreach (['-', '%', '_', 'jo_o'] as $search) {
            $this->asAdmin()->getJson('/api/users?search='.urlencode($search))
                ->assertOk()
                ->assertJsonCount(0, 'data');
        }
    }

    public function test_creates_user_with_default_password(): void
    {
        $this->asAdmin()->postJson('/api/users', $this->validPayload(['email' => ' MARIA@Example.com ', 'username' => ' Maria.Souza ']))
            ->assertCreated()
            ->assertJsonPath('data.username', 'maria.souza')
            ->assertJsonPath('data.cpf', FictitiousCpf::DEFAULT)
            ->assertJsonPath('data.email', 'maria@example.com')
            ->assertJsonPath('data.role', 'employee')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonMissingPath('data.password');

        $user = User::where('email', 'maria@example.com')->sole();
        $this->assertTrue(Hash::check('123@Senha', $user->password));
    }

    public function test_ignores_photo_on_create(): void
    {
        $this->asAdmin()->postJson('/api/users', $this->validPayload(['photo' => 'data:image/png;base64,AAAA']))
            ->assertCreated()
            ->assertJsonMissingPath('data.photo');
    }

    public function test_rejects_duplicate_username_cpf_and_email(): void
    {
        User::factory()->create(['username' => 'maria.souza', 'cpf' => FictitiousCpf::DEFAULT, 'email' => 'maria@example.com']);

        $this->asAdmin()->postJson('/api/users', $this->validPayload(['email' => 'MARIA@example.com', 'username' => 'Maria.Souza']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'username' => 'Este usuário já está em uso.',
                'cpf' => 'Este CPF já está em uso.',
                'email' => 'Este e-mail já está em uso.',
            ]);
    }

    public function test_rejects_invalid_usernames(): void
    {
        // Com @ (confundiria com e-mail), curto, longo, com acento, com espaço no meio.
        foreach (['maria@souza', 'ab', str_repeat('a', 31), 'joão', 'maria souza'] as $username) {
            $this->asAdmin()->postJson('/api/users', $this->validPayload(['username' => $username]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['username']);
        }

        $this->assertSame(1, User::count());
    }

    public function test_rejects_invalid_input(): void
    {
        $this->asAdmin()->postJson('/api/users', [
            'name' => '',
            'cpf' => '123.456.789-00',
            'email' => 'not-an-email',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'username', 'cpf', 'email']);
    }

    public function test_shows_user(): void
    {
        $user = User::factory()->create();

        $this->asAdmin()->getJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonMissingPath('data.password');
    }

    public function test_show_unknown_user_returns_404(): void
    {
        $this->asAdmin()->getJson('/api/users/999999')->assertNotFound();
    }

    public function test_non_numeric_or_out_of_range_id_returns_404(): void
    {
        foreach (['abc', '1.5', '-1', '99999999999999999999'] as $id) {
            $this->asAdmin()->getJson("/api/users/{$id}")
                ->assertNotFound()
                ->assertJson(['message' => 'Registro não encontrado.']);
            $this->asAdmin()->putJson("/api/users/{$id}", $this->validPayload())->assertNotFound();
            $this->asAdmin()->postJson("/api/users/{$id}/deactivate")->assertNotFound();
        }
    }

    public function test_update_rejects_cpf_of_another_user(): void
    {
        User::factory()->create(['cpf' => FictitiousCpf::SECOND]);
        $user = User::factory()->create(['cpf' => FictitiousCpf::DEFAULT, 'email' => 'maria@example.com']);

        $this->asAdmin()->putJson("/api/users/{$user->id}", $this->validPayload(['cpf' => FictitiousCpf::SECOND_MASKED]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cpf']);
    }

    public function test_rejects_role_on_create(): void
    {
        foreach (['admin', 'employee'] as $role) {
            $this->asAdmin()->postJson('/api/users', $this->validPayload(['role' => $role]))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['role' => 'O campo perfil não é permitido.']);
        }

        $this->assertSame(1, User::count());
    }

    public function test_rejects_role_on_update(): void
    {
        $user = User::factory()->create(['cpf' => FictitiousCpf::DEFAULT, 'email' => 'maria@example.com']);

        $this->asAdmin()->putJson("/api/users/{$user->id}", $this->validPayload(['role' => 'admin']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);

        $this->assertSame(Role::Employee, $user->fresh()->role);
    }

    public function test_deactivates_and_activates_user(): void
    {
        $user = User::factory()->create();

        $this->asAdmin()->postJson("/api/users/{$user->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->asAdmin()->postJson("/api/users/{$user->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $this->asAdmin()->postJson("/api/users/{$this->admin->id}/deactivate")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['is_active' => 'Você não pode desativar a sua própria conta.']);

        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_resets_password_to_default(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->asAdmin()->postJson("/api/users/{$user->id}/reset-password")->assertNoContent();

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('123@Senha', $fresh->password));
        $this->assertTrue($fresh->must_change_password);
    }

    // Sessão real (não o usuário em memória do actingAs): a redefinição vale na requisição seguinte.
    private function resetPasswordWithFreshInstance(): void
    {
        app(UserService::class)->resetPassword(User::findOrFail($this->admin->id));
        $this->app['auth']->forgetGuards();
    }

    public function test_password_change_guard_blocks_session_without_password_hash(): void
    {
        $guardKey = Auth::guard('web')->getName();
        $this->withSession([$guardKey => $this->admin->id]);

        $this->fromSpa()->getJson('/api/users')->assertOk();

        // O AuthenticateSession do Sanctum guarda o hash da senha na sessão e, com ele, derrubaria a
        // sessão (401) antes do nosso middleware. Tira o hash para isolar o EnsurePasswordIsChanged.
        session()->forget('password_hash_web');
        session()->save();

        $this->resetPasswordWithFreshInstance();
        $this->withSession([$guardKey => $this->admin->id]);

        $this->fromSpa()->getJson('/api/users')
            ->assertForbidden()
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }

    public function test_password_reset_ends_open_session_via_sanctum(): void
    {
        $this->withSession([Auth::guard('web')->getName() => $this->admin->id]);

        $this->fromSpa()->getJson('/api/users')->assertOk();

        $this->resetPasswordWithFreshInstance();

        // Com o hash da senha na sessão (caso real do navegador), a sessão aberta cai de vez.
        $this->fromSpa()->getJson('/api/users')->assertUnauthorized();
    }
}
