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

    // "Só as minhas" foi descartado (item 0046): o parâmetro não filtra nem é validado.
    public function test_list_ignores_mine(): void
    {
        Demand::factory()->create(['requester_id' => $this->employee->id]);
        Demand::factory()->create();

        foreach (['true', 'talvez'] as $value) {
            $this->listAs($this->employee, "?mine={$value}")->assertOk()->assertJsonCount(2, 'data');
        }
    }

    // Título, categoria e período são da busca (GET /api/demands/search, item 0027): a listagem não os aplica.
    public function test_list_ignores_search_filters(): void
    {
        Demand::factory()->create(['title' => 'Monitor', 'category' => 'it']);
        Demand::factory()->create(['title' => 'Cadeira', 'category' => 'hr', 'created_at' => '2026-01-01 12:00:00']);

        $this->listAs($this->employee, '?search=monitor&category=it&created_from=2026-10-01&created_to=2026-10-01')
            ->assertOk()
            ->assertJsonCount(2, 'data');
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
