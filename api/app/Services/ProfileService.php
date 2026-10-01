<?php

namespace App\Services;

use App\Models\User;

class ProfileService
{
    public function updatePhoto(User $user, ?string $photo): User
    {
        $user->photo = $photo;
        $user->save();

        return $user;
    }

    public function changePassword(User $user, string $password): void
    {
        $user->password = $password;
        $user->must_change_password = false;
        $user->save();
    }
}
