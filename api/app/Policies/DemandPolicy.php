<?php

namespace App\Policies;

use App\Models\Demand;
use App\Models\User;

// Todos veem, criam e atendem (iniciar, finalizar, reabrir — ADR 0003); só o solicitante ou o administrador
// edita e exclui.
class DemandPolicy
{
    public function viewAny(User $actor): bool
    {
        return true;
    }

    public function view(User $actor, Demand $demand): bool
    {
        return true;
    }

    public function create(User $actor): bool
    {
        return true;
    }

    public function update(User $actor, Demand $demand): bool
    {
        return $this->owns($actor, $demand);
    }

    public function delete(User $actor, Demand $demand): bool
    {
        return $this->owns($actor, $demand);
    }

    public function start(User $actor, Demand $demand): bool
    {
        return true;
    }

    public function close(User $actor, Demand $demand): bool
    {
        return true;
    }

    public function reopen(User $actor, Demand $demand): bool
    {
        return true;
    }

    private function owns(User $actor, Demand $demand): bool
    {
        return $actor->isAdmin() || $demand->requester_id === $actor->id;
    }
}
