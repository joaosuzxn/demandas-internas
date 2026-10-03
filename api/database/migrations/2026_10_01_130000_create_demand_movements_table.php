<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Histórico da demanda (item 0026): uma linha por ato, só de inserção — por isso só created_at.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demand_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demand_id')->constrained('demands')->cascadeOnDelete();
            // DemandMovementType.
            $table->string('type', 20);
            // Quem fez. Usuário não é apagado, só desativado; o restrict é rede de segurança.
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');

            $table->index(['demand_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demand_movements');
    }
};
