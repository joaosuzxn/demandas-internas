<?php

namespace Tests\Feature\Users;

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_a_single_admin_even_when_run_twice(): void
    {
        $this->seed();
        $this->seed();

        $admin = User::where('role', Role::Admin)->sole();
        $this->assertSame('Administrador', $admin->name);
        $this->assertSame('admin', $admin->username);
        $this->assertSame('admin@admin.com', $admin->email);
        $this->assertSame('12345678909', $admin->cpf);
        $this->assertTrue($admin->is_active);
        $this->assertTrue($admin->must_change_password);
        $this->assertTrue(Hash::check('password', $admin->password));
    }

    public function test_does_not_create_admin_when_one_already_exists(): void
    {
        $existing = User::factory()->admin()->create();

        $this->seed(AdminSeeder::class);

        $this->assertSame(1, User::count());
        $this->assertTrue(User::where('role', Role::Admin)->sole()->is($existing));
    }

    public function test_seeded_admin_logs_in_and_must_change_password(): void
    {
        $this->seed();

        $this->fromSpa()->postJson('/api/login', ['login' => 'admin', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.must_change_password', true)
            ->assertJsonPath('data.role', 'admin');
    }
}
