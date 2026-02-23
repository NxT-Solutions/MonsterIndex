<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('best_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monster_id')->constrained()->cascadeOnDelete();
            $table->foreignId('snapshot_id')->constrained('price_snapshots')->cascadeOnDelete();
            $table->unsignedInteger('effective_total_cents');
            $table->string('currency', 3)->default('EUR');
            $table->timestamp('computed_at');
            $table->timestamps();

            $table->unique(['monster_id', 'currency']);
            $table->index(['effective_total_cents', 'currency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('best_prices');
    }
};
