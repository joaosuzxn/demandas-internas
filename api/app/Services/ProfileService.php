<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Recaller;
use Illuminate\Support\Facades\Auth;

class ProfileService
{
    // A troca derruba o "lembrar" de todos os aparelhos. O aparelho que trocou a senha continua
    // lembrado, mas só se o cookie que ele mandou ($recallerCookie) ainda valia.
    public function changePassword(User $user, string $password, ?string $recallerCookie = null): void
    {
        $wasRemembered = $this->recallerMatches($user, $recallerCookie);

        $user->password = $password;
        $user->must_change_password = false;
        $user->save(); // o User troca o remember_token

        if ($wasRemembered) {
            Auth::guard('web')->login($user, true);
        }
    }

    // Cookie no formato id|token|hash: vale se for deste usuário e trouxer o remember_token atual.
    // O hash da senha que vem no cookie é ignorado de propósito: isso só é seguro porque toda escrita
    // de senha troca o remember_token (hook `saving` do User).
    private function recallerMatches(User $user, ?string $recallerCookie): bool
    {
        if ($recallerCookie === null) {
            return false;
        }

        $recaller = new Recaller($recallerCookie);

        return $recaller->valid()
            && (string) $recaller->id() === (string) $user->getAuthIdentifier()
            && hash_equals((string) $user->getRememberToken(), $recaller->token());
    }
}
