<?php

namespace Tests\Feature;

use Tests\TestCase;

// Guarda: o container api recebe DB_HOST=db e APP_ENV=local do compose (ADR 0002).
// Se isto falhar, os testes estão rodando contra o banco de dev — e RefreshDatabase apagaria os dados dele.
class TestEnvironmentTest extends TestCase
{
    public function test_runs_in_testing_environment(): void
    {
        $this->assertTrue($this->app->environment('testing'));
        $this->assertTrue($this->app->runningUnitTests());
    }

    public function test_uses_test_database_not_dev(): void
    {
        $this->assertSame('db_test', config('database.connections.pgsql.host'));
    }
}
