<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->setDefaultCurrency('EUR');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setDefaultCurrency('USD');
    }

    private function setDefaultCurrency(string $currency): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE monitors MODIFY currency VARCHAR(3) NOT NULL DEFAULT '{$currency}'");
            DB::statement("ALTER TABLE price_snapshots MODIFY currency VARCHAR(3) NOT NULL DEFAULT '{$currency}'");
            DB::statement("ALTER TABLE best_prices MODIFY currency VARCHAR(3) NOT NULL DEFAULT '{$currency}'");

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE monitors ALTER COLUMN currency SET DEFAULT '{$currency}'");
            DB::statement("ALTER TABLE price_snapshots ALTER COLUMN currency SET DEFAULT '{$currency}'");
            DB::statement("ALTER TABLE best_prices ALTER COLUMN currency SET DEFAULT '{$currency}'");
        }
    }
};
