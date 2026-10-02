<?php

namespace Tests\Feature\Demands;

use App\Enums\DemandCategory;
use App\Enums\DemandStatus;
use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemandModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_open_demand_with_requester(): void
    {
        $demand = Demand::factory()->create()->fresh();

        $this->assertSame(DemandStatus::Open, $demand->status);
        $this->assertInstanceOf(DemandCategory::class, $demand->category);
        $this->assertInstanceOf(User::class, $demand->requester);
    }

    public function test_closed_state_creates_closed_demand(): void
    {
        $this->assertSame(DemandStatus::Closed, Demand::factory()->closed()->create()->fresh()->status);
    }

    public function test_status_defaults_to_open_in_the_database(): void
    {
        $id = DB::table('demands')->insertGetId([
            'title' => 'Sem status',
            'description' => 'Inserida direto no banco.',
            'category' => 'it',
            'requester_id' => User::factory()->create()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertSame(DemandStatus::Open, Demand::findOrFail($id)->status);
    }

    public function test_status_and_requester_are_not_mass_assignable(): void
    {
        $demand = new Demand([
            'title' => 'Título',
            'description' => 'Descrição',
            'category' => 'hr',
            'status' => 'closed',
            'requester_id' => 99,
        ]);

        $this->assertSame('Título', $demand->title);
        $this->assertSame(DemandCategory::Hr, $demand->category);
        $this->assertNull($demand->status);
        $this->assertNull($demand->requester_id);
    }

    public function test_category_has_the_five_fixed_values(): void
    {
        $this->assertSame(
            ['it', 'hr', 'purchasing', 'finance', 'infrastructure'],
            array_column(DemandCategory::cases(), 'value'),
        );
    }

    public function test_delete_is_soft(): void
    {
        $demand = Demand::factory()->create();

        $demand->delete();

        $this->assertSoftDeleted($demand);
        $this->assertNull(Demand::find($demand->id));
        $this->assertNotNull(Demand::withTrashed()->find($demand->id));
    }

    public function test_user_has_many_demands(): void
    {
        $user = User::factory()->create();
        Demand::factory()->count(2)->create(['requester_id' => $user->id]);
        Demand::factory()->create();

        $this->assertCount(2, $user->demands);
    }
}
