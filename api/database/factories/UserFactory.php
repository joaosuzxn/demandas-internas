<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\User;
use App\Rules\Cpf;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    // Sequência única por processo: gera CPF e username sem repetir entre testes.
    protected static int $sequence = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sequence = ++static::$sequence;

        return [
            'name' => fake()->name(),
            'username' => "user{$sequence}",
            'cpf' => static::fictitiousCpf($sequence),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'photo' => null,
            'role' => Role::Employee,
            'is_active' => true,
            'must_change_password' => false,
        ];
    }

    // Nunca fake()->cpf(): ele pode gerar o CPF de uma pessoa real. Prefixo 000 + sequência = fictício.
    public static function fictitiousCpf(int $sequence): string
    {
        return Cpf::withCheckDigits('000'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT));
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => Role::Admin]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function mustChangePassword(): static
    {
        return $this->state(fn () => ['must_change_password' => true]);
    }
}
