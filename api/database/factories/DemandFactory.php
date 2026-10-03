<?php

namespace Database\Factories;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Demand>
 */
class DemandFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(DemandCategory::cases()),
            'status' => DemandStatus::Pending,
            'requester_id' => User::factory(),
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => DemandStatus::InProgress]);
    }

    public function finished(): static
    {
        return $this->state(fn () => ['status' => DemandStatus::Finished]);
    }
}
