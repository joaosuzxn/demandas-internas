<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;

// password, role, is_active e must_change_password ficam fora do Fillable: só os Services os definem.
#[Fillable(['name', 'username', 'cpf', 'email'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    // Mata os cookies de "lembrar" quando a senha muda ou a conta é desativada, venha a escrita de onde vier.
    // O ProfileService confia nisso: ele ignora o hash da senha que vem no cookie.
    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            if ($user->exists && ($user->isDirty('password') || ($user->isDirty('is_active') && ! $user->is_active))) {
                $user->setRememberToken(Str::random(60));
            }
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => Role::class,
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    /**
     * @return HasMany<Demand, $this>
     */
    public function demands(): HasMany
    {
        return $this->hasMany(Demand::class, 'requester_id');
    }
}
