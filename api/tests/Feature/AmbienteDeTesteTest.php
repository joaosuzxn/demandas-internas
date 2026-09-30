<?php

namespace Tests\Feature;

use Tests\TestCase;

// Guarda: o container api recebe DB_HOST=db e APP_ENV=local do compose (ADR 0002).
// Se isto falhar, os testes estão rodando contra o banco de dev — e RefreshDatabase apagaria os dados dele.
class AmbienteDeTesteTest extends TestCase
{
    public function test_roda_no_ambiente_de_testes(): void
    {
        $this->assertTrue($this->app->environment('testing'));
        $this->assertTrue($this->app->runningUnitTests());
    }

    public function test_usa_o_banco_de_testes_e_nao_o_de_dev(): void
    {
        $this->assertSame('db_test', config('database.connections.pgsql.host'));
    }
}
