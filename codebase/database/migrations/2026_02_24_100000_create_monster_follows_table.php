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
        Schema::create('monster_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monster_id')->constrained()->cascadeOnDelete();
            $table->string('currency', 3)->default('EUR');
            $table->timestamp('last_alerted_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'monster_id', 'currency'], 'monster_follows_unique');
            $table->index(['monster_id', 'currency'], 'monster_follows_monster_currency_index');
            $table->index(['user_id', 'updated_at'], 'monster_follows_user_updated_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monster_follows');
    }
};
