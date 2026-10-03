<?php

namespace Tests\Feature\Demands;

use App\Enums\DemandMovementType;
use App\Models\Demand;
use App\Models\DemandMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DemandMovementModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_movement_belongs_to_demand_and_actor_with_enum_type(): void
    {
        $actor = User::factory()->create();
        $demand = Demand::factory()->create();

        $movement = DemandMovement::factory()->for($demand)->for($actor, 'actor')->type(DemandMovementType::Started)->create();

        $fresh = $movement->fresh();
        $this->assertSame(DemandMovementType::Started, $fresh->type);
        $this->assertTrue($fresh->demand->is($demand));
        $this->assertTrue($fresh->actor->is($actor));
        $this->assertNotNull($fresh->created_at);
    }

    public function test_table_has_no_updated_at(): void
    {
        $this->assertFalse(Schema::hasColumn('demand_movements', 'updated_at'));
    }

    // Foco de revisão 5: no mesmo segundo, a ordem é a da gravação (id).
    public function test_demand_movements_are_ordered_by_id(): void
    {
        $demand = Demand::factory()->create();
        $sameTime = now()->startOfSecond();
        $first = DemandMovement::factory()->for($demand)->type(DemandMovementType::Created)->create(['created_at' => $sameTime]);
        $second = DemandMovement::factory()->for($demand)->type(DemandMovementType::Started)->create(['created_at' => $sameTime]);

        $this->assertSame([$first->id, $second->id], $demand->movements()->pluck('id')->all());
    }

    // Sem nenhum Fillable o modelo fica todo protegido: atribuição em massa lança exceção, não passa calada.
    public function test_movements_are_not_mass_assignable(): void
    {
        $this->expectException(MassAssignmentException::class);

        new DemandMovement(['type' => 'started', 'actor_id' => 1, 'demand_id' => 1]);
    }

    public function test_deleting_the_demand_row_deletes_its_movements(): void
    {
        $demand = Demand::factory()->create();
        DemandMovement::factory()->for($demand)->create();

        DB::table('demands')->where('id', $demand->id)->delete();

        $this->assertDatabaseCount('demand_movements', 0);
    }
}
