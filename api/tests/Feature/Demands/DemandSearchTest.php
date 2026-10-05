<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// Busca do quadro (item 0027): GET /api/demands/search filtra por título, categoria e período; a listagem não.
class DemandSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->employee = User::factory()->create();
    }

    private function searchAs(User $user, string $query = ''): TestResponse
    {
        $this->actingAs($user);

        return $this->fromSpa()->getJson('/api/demands/search'.$query);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/demands/search?search=monitor')->assertUnauthorized();
    }

    public function test_without_filters_returns_everything_paginated_from_newest(): void
    {
        foreach (range(1, 12) as $i) {
            Demand::factory()->create(['title' => sprintf('Solicitacao %02d', $i), 'created_at' => now()->subMinutes($i)]);
        }

        $this->searchAs($this->employee)
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.title', 'Solicitacao 01');

        $this->searchAs($this->employee, '?page=2')->assertJsonCount(2, 'data');
    }

    // O quadro busca uma coluna por vez: a situação vale também na busca.
    public function test_filters_by_status_and_rejects_unknown_status(): void
    {
        Demand::factory()->create(['title' => 'Monitor']);
        $finished = Demand::factory()->finished()->create(['title' => 'Monitor']);

        $this->searchAs($this->employee, '?status=finished&search=monitor')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $finished->id);
        $this->searchAs($this->employee, '?status=open')->assertUnprocessable()->assertJsonValidationErrors(['status']);
    }

    public function test_deleted_demands_are_not_found(): void
    {
        Demand::factory()->create(['title' => 'Monitor'])->delete();

        $this->searchAs($this->employee, '?search=monitor')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_filters_by_category(): void
    {
        $hr = Demand::factory()->create(['category' => 'hr']);
        Demand::factory()->create(['category' => 'it']);

        $this->searchAs($this->employee, '?category=hr')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $hr->id);
        $this->searchAs($this->employee, '?category=rh')->assertUnprocessable()->assertJsonValidationErrors(['category']);
    }

    public function test_searches_title_case_insensitively(): void
    {
        $monitor = Demand::factory()->create(['title' => 'Trocar o Monitor', 'description' => 'tela apagando']);
        Demand::factory()->create(['title' => 'Comprar cadeiras', 'description' => 'monitor não é o assunto']);

        foreach (['monitor', 'MONITOR', ' monitor '] as $search) {
            $this->searchAs($this->employee, '?search='.urlencode($search))
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $monitor->id);
        }
    }

    public function test_search_treats_wildcards_literally(): void
    {
        Demand::factory()->create(['title' => 'Trocar monitor']);
        $percent = Demand::factory()->create(['title' => 'Desconto de 10% na compra']);

        foreach (['_', 'mon_tor', '\\'] as $search) {
            $this->searchAs($this->employee, '?search='.urlencode($search))->assertOk()->assertJsonCount(0, 'data');
        }

        $this->searchAs($this->employee, '?search='.urlencode('%'))
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $percent->id);
    }

    public function test_search_longer_than_100_characters_is_rejected(): void
    {
        $this->searchAs($this->employee, '?search='.str_repeat('a', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);
    }

    // O banco grava em UTC; o período é de dias inteiros no horário de Brasília (UTC-3).
    public function test_filters_by_period_in_business_timezone(): void
    {
        $before = Demand::factory()->create(['created_at' => '2026-10-01 02:59:59']); // 30/09 23:59:59
        $first = Demand::factory()->create(['created_at' => '2026-10-01 03:00:00']); // 01/10 00:00
        $lateNight = Demand::factory()->create(['created_at' => '2026-10-04 01:00:00']); // 03/10 22:00
        $after = Demand::factory()->create(['created_at' => '2026-10-04 03:00:00']); // 04/10 00:00

        $ids = fn (string $query) => collect($this->searchAs($this->employee, $query)->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();

        $this->assertSame([$first->id, $lateNight->id], $ids('?created_from=2026-10-01&created_to=2026-10-03'));
        $this->assertSame([$first->id, $lateNight->id, $after->id], $ids('?created_from=2026-10-01'));
        $this->assertSame([$before->id, $first->id, $lateNight->id], $ids('?created_to=2026-10-03'));
        $this->assertSame([$lateNight->id], $ids('?created_from=2026-10-03&created_to=2026-10-03'));
    }

    public function test_invalid_period_is_rejected(): void
    {
        $this->searchAs($this->employee, '?created_from=2026-10-03&created_to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['created_to' => 'O campo até deve ser uma data igual ou posterior a de.']);

        foreach (['03/10/2026', '2026-02-31', 'ontem'] as $value) {
            $this->searchAs($this->employee, '?created_from='.urlencode($value))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['created_from' => 'O campo de deve ser uma data no formato AAAA-MM-DD.']);
        }
    }

    // Mesmo piso do dashboard: digitar o ano no campo de data passa por 0002, 0020, 0202.
    public function test_rejects_dates_before_2000(): void
    {
        $this->searchAs($this->employee, '?created_from=0002-10-01')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_from']);
        $this->searchAs($this->employee, '?created_to=1999-12-31')
            ->assertUnprocessable()->assertJsonValidationErrors(['created_to']);
        $this->searchAs($this->employee, '?created_from=2000-01-01')->assertOk();
    }

    public function test_filters_combine(): void
    {
        $match = Demand::factory()->finished()->create(['category' => 'it', 'title' => 'Monitor']);
        Demand::factory()->create(['category' => 'it', 'title' => 'Monitor']);
        Demand::factory()->finished()->create(['category' => 'hr', 'title' => 'Monitor']);
        Demand::factory()->finished()->create(['category' => 'it', 'title' => 'Cadeira']);
        Demand::factory()->finished()->create(['category' => 'it', 'title' => 'Monitor', 'created_at' => now()->subDays(10)]);

        $today = now('America/Sao_Paulo')->toDateString();

        $this->searchAs($this->employee, "?status=finished&category=it&search=monitor&created_from={$today}&created_to={$today}")
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }
}
