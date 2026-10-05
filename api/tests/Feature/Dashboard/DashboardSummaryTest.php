<?php

namespace Tests\Feature\Dashboard;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// Indicadores do dashboard (item 0030): GET /api/dashboard/summary conta as solicitações por situação atual.
class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function summary(string $query = ''): TestResponse
    {
        $this->actingAs(User::factory()->create());

        return $this->fromSpa()->getJson('/api/dashboard/summary'.$query);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/dashboard/summary')->assertUnauthorized();
    }

    public function test_without_demands_everything_is_zero(): void
    {
        $this->summary()->assertOk()->assertExactJson([
            'data' => ['total' => 0, 'pending' => 0, 'in_progress' => 0, 'finished' => 0],
        ]);
    }

    public function test_counts_by_current_status_and_total_is_the_sum(): void
    {
        Demand::factory()->count(3)->create();
        Demand::factory()->count(2)->inProgress()->create();
        Demand::factory()->finished()->create();

        $this->summary()->assertExactJson([
            'data' => ['total' => 6, 'pending' => 3, 'in_progress' => 2, 'finished' => 1],
        ]);
    }

    public function test_deleted_demands_are_not_counted(): void
    {
        Demand::factory()->create();
        Demand::factory()->create()->delete();

        $this->summary()->assertJsonPath('data.total', 1)->assertJsonPath('data.pending', 1);
    }

    public function test_filters_by_category(): void
    {
        Demand::factory()->create(['category' => 'hr']);
        Demand::factory()->create(['category' => 'it']);

        $this->summary('?category=hr')->assertJsonPath('data.total', 1);
        $this->summary('?category=rh')->assertUnprocessable()->assertJsonValidationErrors(['category']);
    }

    // Dias inteiros no horário de Brasília (UTC-3): 01/10 vai de 01/10 03:00 a 02/10 02:59:59 em UTC.
    public function test_period_uses_whole_business_days(): void
    {
        Demand::factory()->create(['created_at' => '2026-10-01 02:59:59']); // 30/09 23:59:59
        Demand::factory()->create(['created_at' => '2026-10-01 03:00:00']); // 01/10 00:00
        Demand::factory()->create(['created_at' => '2026-10-02 02:30:00']); // 01/10 23:30
        Demand::factory()->create(['created_at' => '2026-10-02 03:00:00']); // 02/10 00:00

        $this->summary('?created_from=2026-10-01&created_to=2026-10-01')->assertJsonPath('data.total', 2);
        $this->summary('?created_from=2026-10-01')->assertJsonPath('data.total', 3);
        $this->summary('?created_to=2026-09-30')->assertJsonPath('data.total', 1);
    }

    public function test_rejects_invalid_period(): void
    {
        $this->summary('?created_from=2026-10-03&created_to=2026-10-01')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_to']);
        $this->summary('?created_from=01/10/2026')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_from']);
    }
}
