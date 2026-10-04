<?php

namespace Tests\Feature\Dashboard;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// Card "Por categoria" (item 0030): as cinco categorias, sempre, na ordem do enum.
class DashboardCategoriesTest extends TestCase
{
    use RefreshDatabase;

    private function categories(string $query = ''): TestResponse
    {
        $this->actingAs(User::factory()->create());

        return $this->fromSpa()->getJson('/api/dashboard/categories'.$query);
    }

    public function test_guest_gets_unauthorized(): void
    {
        $this->fromSpa()->getJson('/api/dashboard/categories')->assertUnauthorized();
    }

    public function test_lists_all_five_categories_in_enum_order_with_zeros(): void
    {
        Demand::factory()->count(2)->create(['category' => 'hr']);
        Demand::factory()->create(['category' => 'finance']);
        Demand::factory()->create(['category' => 'finance'])->delete();

        $this->categories()->assertOk()->assertExactJson(['data' => [
            ['category' => 'it', 'total' => 0],
            ['category' => 'hr', 'total' => 2],
            ['category' => 'purchasing', 'total' => 0],
            ['category' => 'finance', 'total' => 1],
            ['category' => 'infrastructure', 'total' => 0],
        ]]);
    }

    public function test_period_and_category_filters_apply(): void
    {
        Demand::factory()->create(['category' => 'it', 'created_at' => '2026-09-15 12:00:00']);
        Demand::factory()->create(['category' => 'it', 'created_at' => '2026-10-01 12:00:00']);
        Demand::factory()->create(['category' => 'hr', 'created_at' => '2026-10-01 12:00:00']);

        $this->categories('?created_from=2026-10-01')
            ->assertJsonPath('data.0.total', 1)
            ->assertJsonPath('data.1.total', 1);
        $this->categories('?category=hr')
            ->assertJsonPath('data.0.total', 0)
            ->assertJsonPath('data.1.total', 1);
    }
}
