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
        Schema::create('contributor_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monster_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('price_snapshot_id')->constrained('price_snapshots')->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('currency', 3)->default('EUR');
            $table->unsignedInteger('effective_total_cents');
            $table->string('title');
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at', 'created_at'], 'contributor_alerts_user_read_created_index');
            $table->index(['user_id', 'monster_id', 'currency', 'created_at'], 'contributor_alerts_user_monster_currency_created_index');
            $table->unique(['user_id', 'price_snapshot_id', 'type'], 'contributor_alerts_snapshot_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contributor_alerts');
    }
};
