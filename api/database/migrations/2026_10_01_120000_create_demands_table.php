<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demands', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->text('description');
            // String, e não enum do PostgreSQL: categoria nova entra só no enum do PHP.
            $table->string('category', 20);
            // pending, in_progress ou finished (DemandStatus); 20 cabe o maior valor com folga.
            $table->string('status', 20)->default('pending')->index();
            // Usuário não é apagado, só desativado; o restrict é rede de segurança.
            $table->foreignId('requester_id')->index()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demands');
    }
};
