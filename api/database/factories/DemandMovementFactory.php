<?php

namespace Database\Factories;

use App\Enums\DemandMovementType;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DemandMovement>
 */
class DemandMovementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'demand_id' => Demand::factory(),
            'type' => DemandMovementType::Created,
            'actor_id' => User::factory(),
        ];
    }

    public function type(DemandMovementType $type): static
    {
        return $this->state(fn () => ['type' => $type]);
    }
}
