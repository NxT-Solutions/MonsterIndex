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
        Schema::create('monitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monster_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->string('product_url', 2048);
            $table->json('selector_config')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('check_interval_minutes')->default(60);
            $table->timestamp('next_check_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['active', 'next_check_at']);
            $table->index(['monster_id', 'site_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitors');
    }
};
