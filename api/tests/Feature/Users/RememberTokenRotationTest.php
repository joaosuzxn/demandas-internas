<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// O cookie de "lembrar" só cai se o remember_token mudar. A regra mora no model: qualquer caminho que grave a senha
// ou desative a conta (service, comando, tinker) troca o token, sem depender de cada um lembrar a linha.
class RememberTokenRotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_writing_the_password_rotates_the_remember_token(): void
    {
        $user = User::factory()->create(['remember_token' => 'token-antigo']);

        $user->password = 'Outra@Senha1';
        $user->save();

        $this->assertNotSame('token-antigo', $user->fresh()->remember_token);
    }

    public function test_deactivating_rotates_the_remember_token(): void
    {
        $user = User::factory()->create(['remember_token' => 'token-antigo']);

        $user->is_active = false;
        $user->save();

        $this->assertNotSame('token-antigo', $user->fresh()->remember_token);
    }

    public function test_other_changes_keep_the_remember_token(): void
    {
        $user = User::factory()->create(['remember_token' => 'token-antigo', 'is_active' => false]);

        $user->name = 'Outro Nome';
        $user->is_active = true;
        $user->save();

        $this->assertSame('token-antigo', $user->fresh()->remember_token);
    }
}
