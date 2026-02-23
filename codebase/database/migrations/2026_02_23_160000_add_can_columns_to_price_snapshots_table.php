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
        Schema::table('price_snapshots', function (Blueprint $table) {
            $table->unsignedInteger('can_count')->nullable()->after('effective_total_cents');
            $table->unsignedInteger('price_per_can_cents')->nullable()->after('can_count');
            $table->index(['price_per_can_cents', 'currency']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('price_snapshots', function (Blueprint $table) {
            $table->dropIndex(['price_per_can_cents', 'currency']);
            $table->dropColumn(['can_count', 'price_per_can_cents']);
        });
    }
};
