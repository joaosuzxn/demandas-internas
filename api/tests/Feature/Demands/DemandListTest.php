<?php

namespace Tests\Feature\Demands;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DemandListTest extends TestCase
{
    use RefreshDatabase;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->employee = User::factory()->create(['name' => 'Maria Souza']);
    }

    private function listAs(User $user, string $query = ''): TestResponse
    {
        $this->actingAs($user);

        return $this->fromSpa()->getJson('/api/demands'.$query);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/demands')->assertUnauthorized();
    }

    public function test_employee_sees_demands_of_everyone(): void
    {
        Demand::factory()->create(['requester_id' => $this->employee->id]);
        Demand::factory()->count(2)->create();

        $this->listAs($this->employee)
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.total', 3);
    }

    public function test_lists_paginated_from_newest_to_oldest(): void
    {
        // Criadas fora de ordem; a 01 é a mais recente.
        foreach (collect(range(1, 24))->shuffle() as $i) {
            Demand::factory()->create([
                'title' => sprintf('Solicitacao %02d', $i),
                'created_at' => now()->subMinutes($i),
            ]);
        }

        $this->listAs($this->employee)
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 24)
            ->assertJsonPath('meta.per_page', 10)
            // A rolagem infinita do quadro (SPA) decide se há mais por current_page e last_page.
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('data.0.title', 'Solicitacao 01')
            ->assertJsonPath('data.9.title', 'Solicitacao 10');

        $this->listAs($this->employee, '?page=2')
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('data.0.title', 'Solicitacao 11');

        $this->listAs($this->employee, '?page=3')
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonPath('data.0.title', 'Solicitacao 21');
    }

    public function test_same_timestamp_is_ordered_by_newest_id(): void
    {
        $moment = now()->startOfSecond();
        $first = Demand::factory()->create(['created_at' => $moment]);
        $second = Demand::factory()->create(['created_at' => $moment]);

        $this->listAs($this->employee)
            ->assertJsonPath('data.0.id', $second->id)
            ->assertJsonPath('data.1.id', $first->id);
    }

    public function test_page_beyond_the_last_is_empty_and_invalid_page_is_rejected(): void
    {
        Demand::factory()->create();

        $this->listAs($this->employee, '?page=9')->assertOk()->assertJsonCount(0, 'data');
        $this->listAs($this->employee, '?page=0')->assertUnprocessable()->assertJsonValidationErrors(['page']);
        $this->listAs($this->employee, '?page=abc')->assertUnprocessable()->assertJsonValidationErrors(['page']);
    }

    public function test_filters_by_status(): void
    {
        $pending = Demand::factory()->create();
        $inProgress = Demand::factory()->inProgress()->create();
        $finished = Demand::factory()->finished()->create();

        $this->listAs($this->employee, '?status=pending')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pending->id);
        $this->listAs($this->employee, '?status=in_progress')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $inProgress->id);
        $this->listAs($this->employee, '?status=finished')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $finished->id);
        $this->listAs($this->employee, '?status=aberto')->assertUnprocessable()->assertJsonValidationErrors(['status']);
    }

    // Os valores de antes da troca (item 0022) não existem mais: 422, e não lista vazia sem aviso.
    public function test_old_status_values_are_rejected(): void
    {
        $this->listAs($this->employee, '?status=open')->assertUnprocessable()->assertJsonValidationErrors(['status']);
        $this->listAs($this->employee, '?status=closed')->assertUnprocessable()->assertJsonValidationErrors(['status']);
    }

    public function test_filters_by_category(): void
    {
        $hr = Demand::factory()->create(['category' => 'hr']);
        Demand::factory()->create(['category' => 'it']);

        $this->listAs($this->employee, '?category=hr')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $hr->id);
        $this->listAs($this->employee, '?category=rh')->assertUnprocessable()->assertJsonValidationErrors(['category']);
    }

    public function test_searches_title_case_insensitively(): void
    {
        $monitor = Demand::factory()->create(['title' => 'Trocar o Monitor', 'description' => 'tela apagando']);
        Demand::factory()->create(['title' => 'Comprar cadeiras', 'description' => 'monitor não é o assunto']);

        foreach (['monitor', 'MONITOR', ' monitor '] as $search) {
            $this->listAs($this->employee, '?search='.urlencode($search))
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
            $this->listAs($this->employee, '?search='.urlencode($search))->assertOk()->assertJsonCount(0, 'data');
        }

        $this->listAs($this->employee, '?search='.urlencode('%'))
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $percent->id);
    }

    public function test_search_longer_than_100_characters_is_rejected(): void
    {
        $this->listAs($this->employee, '?search='.str_repeat('a', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);
    }

    // O Axios manda true/false em texto.
    public function test_mine_filter_accepts_textual_booleans(): void
    {
        $mine = Demand::factory()->create(['requester_id' => $this->employee->id]);
        Demand::factory()->create();

        foreach (['true', '1'] as $value) {
            $this->listAs($this->employee, "?mine={$value}")
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $mine->id);
        }

        foreach (['false', '0', ''] as $value) {
            $this->listAs($this->employee, "?mine={$value}")->assertOk()->assertJsonCount(2, 'data');
        }

        $this->listAs($this->employee, '?mine=talvez')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['mine' => 'O campo só as minhas deve ser verdadeiro ou falso.']);
    }

    // O banco grava em UTC; o período é de dias inteiros no horário de Brasília (UTC-3).
    public function test_filters_by_period_in_business_timezone(): void
    {
        $before = Demand::factory()->create(['created_at' => '2026-10-01 02:59:59']); // 30/09 23:59:59
        $first = Demand::factory()->create(['created_at' => '2026-10-01 03:00:00']); // 01/10 00:00
        $lateNight = Demand::factory()->create(['created_at' => '2026-10-04 01:00:00']); // 03/10 22:00
        $after = Demand::factory()->create(['created_at' => '2026-10-04 03:00:00']); // 04/10 00:00

        $ids = fn (string $query) => collect($this->listAs($this->employee, $query)->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();

        $this->assertSame([$first->id, $lateNight->id], $ids('?created_from=2026-10-01&created_to=2026-10-03'));
        $this->assertSame([$first->id, $lateNight->id, $after->id], $ids('?created_from=2026-10-01'));
        $this->assertSame([$before->id, $first->id, $lateNight->id], $ids('?created_to=2026-10-03'));
        $this->assertSame([$lateNight->id], $ids('?created_from=2026-10-03&created_to=2026-10-03'));
    }

    public function test_invalid_period_is_rejected(): void
    {
        $this->listAs($this->employee, '?created_from=2026-10-03&created_to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['created_to' => 'O campo até deve ser uma data igual ou posterior a de.']);

        foreach (['03/10/2026', '2026-02-31', 'ontem'] as $value) {
            $this->listAs($this->employee, '?created_from='.urlencode($value))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['created_from' => 'O campo de deve ser uma data no formato AAAA-MM-DD.']);
        }
    }

    public function test_filters_combine(): void
    {
        $match = Demand::factory()->finished()->create(['requester_id' => $this->employee->id, 'category' => 'it', 'title' => 'Monitor']);
        Demand::factory()->create(['requester_id' => $this->employee->id, 'category' => 'it', 'title' => 'Monitor']);
        Demand::factory()->finished()->create(['category' => 'it', 'title' => 'Monitor']);
        Demand::factory()->finished()->create(['requester_id' => $this->employee->id, 'category' => 'hr', 'title' => 'Monitor']);
        Demand::factory()->finished()->create(['requester_id' => $this->employee->id, 'category' => 'it', 'title' => 'Cadeira']);
        Demand::factory()->finished()->create(['requester_id' => $this->employee->id, 'category' => 'it', 'title' => 'Monitor', 'created_at' => now()->subDays(10)]);

        $today = now('America/Sao_Paulo')->toDateString();

        $this->listAs($this->employee, "?status=finished&category=it&search=monitor&mine=true&created_from={$today}&created_to={$today}")
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_deleted_demands_are_not_listed(): void
    {
        $kept = Demand::factory()->create();
        Demand::factory()->create()->delete();

        $this->listAs($this->employee)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $kept->id);
    }

    // Solicitação de usuário desativado continua visível, com o nome dele.
    public function test_demand_of_deactivated_user_is_still_listed(): void
    {
        $inactive = User::factory()->inactive()->create(['name' => 'Ex Colaborador']);
        Demand::factory()->create(['requester_id' => $inactive->id]);

        $this->listAs($this->employee)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.requester.name', 'Ex Colaborador');
    }

    public function test_list_does_not_expose_requester_private_data(): void
    {
        Demand::factory()->create(['requester_id' => $this->employee->id]);

        $response = $this->listAs(User::factory()->create())->assertOk();

        $this->assertSame(['id', 'name'], array_keys($response->json('data.0.requester')));
        $this->assertStringNotContainsString($this->employee->cpf, $response->getContent());
        $this->assertStringNotContainsString($this->employee->email, $response->getContent());
    }

    // Sem consulta por linha: o número de consultas não cresce com o número de solicitações.
    public function test_query_count_does_not_grow_with_the_number_of_demands(): void
    {
        Demand::factory()->create();
        $withOne = $this->countQueriesOfList();

        Demand::factory()->count(5)->create();
        $withSix = $this->countQueriesOfList();

        $this->assertSame($withOne, $withSix);
    }

    private function countQueriesOfList(): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->listAs($this->employee)->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    }
}
