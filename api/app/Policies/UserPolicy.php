<?php

namespace App\Policies;

use App\Models\User;

// Gestão de usuários é só do administrador (spec §5.2). A autoproteção fica no UserService.
class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isAdmin();
    }

    public function view(User $actor, User $user): bool
    {
        return $actor->isAdmin();
    }

    public function create(User $actor): bool
    {
        return $actor->isAdmin();
    }

    public function update(User $actor, User $user): bool
    {
        return $actor->isAdmin();
    }

    public function deactivate(User $actor, User $user): bool
    {
        return $actor->isAdmin();
    }

    public function activate(User $actor, User $user): bool
    {
        return $actor->isAdmin();
    }

    public function resetPassword(User $actor, User $user): bool
    {
        return $actor->isAdmin();
    }
}
