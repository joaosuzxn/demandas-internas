<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Cria a única conta de administrador. Idempotente: roda a cada subida do container.
     * Sem factory de propósito: a imagem de prod não tem Faker.
     */
    public function run(): void
    {
        if (User::where('role', Role::Admin)->exists()) {
            return;
        }

        // A senha é fixa e conhecida, então a conta nasce com troca obrigatória: o sistema inteiro
        // fica bloqueado para ela até a senha ser trocada.
        $admin = new User;
        $admin->forceFill([
            'name' => 'Administrador',
            'username' => 'admin',
            'cpf' => '12345678909', // fictício
            'email' => 'admin@admin.com',
            'password' => 'password', // o cast hashed faz o hash
            'role' => Role::Admin,
            'is_active' => true,
            'must_change_password' => true,
        ])->save();
    }
}
