<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_retorna_ok_quando_o_banco_responde(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'app' => config('app.name'),
                'database' => 'ok',
            ]);
    }

    public function test_retorna_503_sem_detalhes_quando_o_banco_esta_fora(): void
    {
        config([
            'database.connections.pgsql.host' => '127.0.0.1',
            'database.connections.pgsql.port' => 1,
        ]);
        DB::purge('pgsql');

        $this->getJson('/api/health')
            ->assertStatus(503)
            ->assertExactJson([
                'status' => 'erro',
                'app' => config('app.name'),
                'database' => 'erro',
            ]);
    }

    public function test_retorna_503_sem_detalhes_quando_o_banco_esta_fora_e_a_chamada_vem_da_spa(): void
    {
        config([
            'database.connections.pgsql.host' => '127.0.0.1',
            'database.connections.pgsql.port' => 1,
            'session.driver' => 'database',
        ]);
        DB::purge('pgsql');

        $this->withHeaders([
            'Origin' => 'http://localhost:8080',
            'Referer' => 'http://localhost:8080/',
        ])->getJson('/api/health')
            ->assertStatus(503)
            ->assertExactJson([
                'status' => 'erro',
                'app' => config('app.name'),
                'database' => 'erro',
            ]);
    }

    public function test_health_chamado_pela_spa_nao_abre_sessao(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:8080',
            'Referer' => 'http://localhost:8080/',
        ])->getJson('/api/health')
            ->assertOk()
            ->assertCookieMissing(config('session.cookie'))
            ->assertCookieMissing('XSRF-TOKEN');
    }

    public function test_rota_inexistente_da_api_responde_404_em_json(): void
    {
        $this->getJson('/api/rota-inexistente')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json');
    }
}
