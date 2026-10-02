<?php

namespace Tests\Feature\Users;

use App\Enums\Role;
use App\Models\User;
use App\Rules\Cpf;
use App\Services\UserService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\Support\FictitiousCpf;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_is_hashed_and_hidden(): void
    {
        $user = User::factory()->create(['password' => 'Minha@Senha1']);

        $this->assertNotSame('Minha@Senha1', $user->password);
        $this->assertTrue(Hash::check('Minha@Senha1', $user->password));
        $this->assertArrayNotHasKey('password', $user->toArray());
    }

    public function test_role_is_cast_to_enum(): void
    {
        $this->assertSame(Role::Employee, User::factory()->create()->role);
        $this->assertTrue(User::factory()->admin()->create()->isAdmin());
        $this->assertFalse(User::factory()->create()->isAdmin());
    }

    public function test_database_defaults(): void
    {
        DB::table('users')->insert([
            'name' => 'Pessoa Teste',
            'username' => 'pessoa.teste',
            'cpf' => FictitiousCpf::DEFAULT,
            'email' => 'pessoa@example.com',
            'password' => Hash::make('x'),
        ]);

        $user = User::sole();
        $this->assertSame(Role::Employee, $user->role);
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->must_change_password);
        $this->assertNull($user->photo);
    }

    public function test_factory_generates_fictitious_valid_unique_cpfs_and_usernames(): void
    {
        $users = User::factory()->count(3)->create();

        $this->assertCount(3, $users->pluck('cpf')->unique());
        $this->assertCount(3, $users->pluck('username')->unique());
        foreach ($users as $user) {
            $this->assertStringStartsWith('000', $user->cpf);
            $this->assertTrue(Cpf::isValid($user->cpf), $user->cpf);
            $this->assertMatchesRegularExpression('/^user\d+$/', $user->username);
        }
    }

    public function test_username_is_unique_in_database(): void
    {
        User::factory()->create(['username' => 'maria.souza']);

        $this->expectException(QueryException::class);
        User::factory()->create(['username' => 'maria.souza']);
    }

    public function test_cpf_is_unique_in_database(): void
    {
        User::factory()->create(['cpf' => FictitiousCpf::DEFAULT]);

        $this->expectException(QueryException::class);
        User::factory()->create(['cpf' => FictitiousCpf::DEFAULT]);
    }

    public function test_email_is_unique_in_database(): void
    {
        User::factory()->create(['email' => 'maria@example.com']);

        $this->expectException(QueryException::class);
        User::factory()->create(['email' => 'maria@example.com']);
    }

    public function test_service_creates_user_with_default_password_pending_change(): void
    {
        $user = app(UserService::class)->create([
            'name' => 'Maria Souza',
            'username' => 'maria.souza',
            'cpf' => FictitiousCpf::DEFAULT,
            'email' => 'maria@example.com',
        ]);

        $this->assertTrue(Hash::check('123@Senha', $user->password));
        $this->assertTrue($user->must_change_password);
        $this->assertTrue($user->is_active);
        $this->assertSame(Role::Employee, $user->role);
    }

    public function test_role_is_not_mass_assignable(): void
    {
        $this->assertNull((new User(['role' => 'admin']))->getAttribute('role'));
    }

    public function test_service_refuses_to_create_user_without_default_password(): void
    {
        config(['auth.default_password' => null]);

        $this->expectException(RuntimeException::class);
        app(UserService::class)->create([
            'name' => 'Maria Souza',
            'username' => 'maria.souza',
            'cpf' => FictitiousCpf::DEFAULT,
            'email' => 'maria@example.com',
        ]);
    }
}
