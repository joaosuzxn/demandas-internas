<?php

namespace Tests\Feature\Dashboard;

use App\Enums\DemandMovementType;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// Gráfico "Evolução das demandas" (item 0030): criadas por data de criação, concluídas por data da conclusão.
class DashboardTrendTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Hoje: 04/10/2026 12:00 em Brasília.
        $this->travelTo(Carbon::parse('2026-10-04 15:00:00', 'UTC'));
    }

    private function trend(string $query = ''): TestResponse
    {
        $this->actingAs(User::factory()->create());

        return $this->fromSpa()->getJson('/api/dashboard/trend'.$query);
    }

    private function finishedAt(Demand $demand, string $utc): void
    {
        DemandMovement::factory()->type(DemandMovementType::Finished)->create([
            'demand_id' => $demand->id,
            'created_at' => $utc,
        ]);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/dashboard/trend')->assertUnauthorized();
    }

    public function test_daily_points_fill_empty_days_with_zero(): void
    {
        Demand::factory()->create(['created_at' => '2026-10-01 12:00:00']);
        Demand::factory()->create(['created_at' => '2026-10-03 12:00:00']);

        $this->trend('?created_from=2026-10-01&created_to=2026-10-04')->assertOk()->assertExactJson(['data' => [
            'granularity' => 'day',
            'points' => [
                ['date' => '2026-10-01', 'created' => 1, 'finished' => 0],
                ['date' => '2026-10-02', 'created' => 0, 'finished' => 0],
                ['date' => '2026-10-03', 'created' => 1, 'finished' => 0],
                ['date' => '2026-10-04', 'created' => 0, 'finished' => 0],
            ],
        ]]);
    }

    public function test_point_uses_the_business_day(): void
    {
        Demand::factory()->create(['created_at' => '2026-10-02 02:30:00']); // 01/10 23:30 em Brasília

        $this->trend('?created_from=2026-10-01&created_to=2026-10-02')
            ->assertJsonPath('data.points.0.created', 1)
            ->assertJsonPath('data.points.1.created', 0);
    }

    // Uma demanda reaberta e concluída de novo conta uma vez por conclusão; a conclusão conta no dia em que
    // aconteceu, mesmo que a demanda tenha sido criada antes do período.
    public function test_finished_counts_each_finish_on_its_own_day(): void
    {
        $old = Demand::factory()->finished()->create(['created_at' => '2026-09-01 12:00:00']);
        $this->finishedAt($old, '2026-10-02 12:00:00');
        $this->finishedAt($old, '2026-10-03 12:00:00');
        $this->finishedAt($old, '2026-10-03 13:00:00');
        $deleted = Demand::factory()->finished()->create(['created_at' => '2026-10-02 12:00:00']);
        $this->finishedAt($deleted, '2026-10-02 13:00:00');
        $deleted->delete();

        $this->trend('?created_from=2026-10-02&created_to=2026-10-03')->assertExactJson(['data' => [
            'granularity' => 'day',
            'points' => [
                ['date' => '2026-10-02', 'created' => 0, 'finished' => 1],
                ['date' => '2026-10-03', 'created' => 0, 'finished' => 2],
            ],
        ]]);
    }

    public function test_category_filters_created_and_finished(): void
    {
        $it = Demand::factory()->create(['category' => 'it', 'created_at' => '2026-10-04 12:00:00']);
        $this->finishedAt($it, '2026-10-04 13:00:00');
        $hr = Demand::factory()->create(['category' => 'hr', 'created_at' => '2026-10-04 12:00:00']);
        $this->finishedAt($hr, '2026-10-04 13:00:00');

        $this->trend('?created_from=2026-10-04&category=hr')
            ->assertJsonPath('data.points.0', ['date' => '2026-10-04', 'created' => 1, 'finished' => 1]);
    }

    // "3 meses" de 04/07 a hoje (04/10) são 93 dias contando hoje: o maior "3 meses" possível ainda é por dia.
    public function test_three_months_up_to_today_stays_daily(): void
    {
        $this->trend('?created_from=2026-07-04&created_to=2026-10-04')
            ->assertJsonPath('data.granularity', 'day')
            ->assertJsonCount(93, 'data.points');
    }

    // Até 93 dias, por dia; acima disso, por mês, com a data no dia 1.
    public function test_long_periods_are_grouped_by_month(): void
    {
        Demand::factory()->create(['created_at' => '2026-07-15 12:00:00']);
        Demand::factory()->create(['created_at' => '2026-07-31 12:00:00']);
        Demand::factory()->create(['created_at' => '2026-10-04 12:00:00']);

        $this->trend('?created_from=2026-07-04&created_to=2026-10-03')->assertJsonPath('data.granularity', 'day')
            ->assertJsonCount(92, 'data.points');

        $this->trend('?created_from=2026-07-03&created_to=2026-10-04')->assertExactJson(['data' => [
            'granularity' => 'month',
            'points' => [
                ['date' => '2026-07-01', 'created' => 2, 'finished' => 0],
                ['date' => '2026-08-01', 'created' => 0, 'finished' => 0],
                ['date' => '2026-09-01', 'created' => 0, 'finished' => 0],
                ['date' => '2026-10-01', 'created' => 1, 'finished' => 0],
            ],
        ]]);
    }

    // "Tudo": sem created_from, começa no dia da demanda mais antiga e termina hoje.
    public function test_without_dates_starts_at_the_oldest_demand_and_ends_today(): void
    {
        Demand::factory()->create(['created_at' => '2026-10-02 12:00:00']);

        $this->trend()->assertJsonPath('data.granularity', 'day')
            ->assertJsonCount(3, 'data.points')
            ->assertJsonPath('data.points.0.date', '2026-10-02')
            ->assertJsonPath('data.points.2.date', '2026-10-04');
    }

    public function test_without_dates_and_without_demands_points_are_empty(): void
    {
        Demand::factory()->create(['category' => 'it']);

        $this->trend('?category=hr')->assertExactJson(['data' => ['granularity' => 'day', 'points' => []]]);
    }

    public function test_period_after_its_end_gives_no_points(): void
    {
        $this->trend('?created_from=2026-10-10')->assertExactJson(['data' => ['granularity' => 'day', 'points' => []]]);
    }

    public function test_rejects_invalid_filters(): void
    {
        $this->trend('?created_from=2026-10-03&created_to=2026-10-01')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_to']);
    }

    // Digitar o ano no campo de data passa por 0002, 0020, 0202: datas antes de 2000 não pedem séculos de pontos.
    public function test_rejects_dates_before_2000(): void
    {
        $this->trend('?created_from=0002-10-01')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_from']);
        $this->trend('?created_to=1999-12-31')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_to']);
    }
}
