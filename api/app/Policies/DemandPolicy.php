<?php

namespace App\Policies;

use App\Models\Demand;
use App\Models\User;

// Todos veem e criam; só o solicitante ou o administrador altera (spec de solicitações §5.1).
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

    public function close(User $actor, Demand $demand): bool
    {
        return $this->owns($actor, $demand);
    }

    public function reopen(User $actor, Demand $demand): bool
    {
        return $this->owns($actor, $demand);
    }

    private function owns(User $actor, Demand $demand): bool
    {
        return $actor->isAdmin() || $demand->requester_id === $actor->id;
    }
}
