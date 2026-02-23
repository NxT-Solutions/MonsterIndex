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
        Schema::create('price_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->timestamp('checked_at');
            $table->unsignedInteger('price_cents')->nullable();
            $table->unsignedInteger('shipping_cents')->nullable();
            $table->unsignedInteger('effective_total_cents')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->string('availability')->nullable();
            $table->text('raw_text')->nullable();
            $table->string('status')->default('ok');
            $table->string('error_code')->nullable();
            $table->timestamps();

            $table->index(['monitor_id', 'checked_at']);
            $table->index(['status', 'checked_at']);
            $table->index(['effective_total_cents', 'currency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('price_snapshots');
    }
};
