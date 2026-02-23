<?php

namespace Database\Seeders;

use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'you@example.com',
            'google_id' => 'seed-admin-google-id',
            'role' => 'admin',
        ]);

        User::factory()->count(2)->create();

        Monster::query()->insert([
            [
                'name' => 'Monster Energy Original 16oz',
                'slug' => 'monster-energy-original-16oz',
                'size_label' => '16oz',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Monster Ultra White 16oz',
                'slug' => 'monster-ultra-white-16oz',
                'size_label' => '16oz',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Monster Pipeline Punch 16oz',
                'slug' => 'monster-pipeline-punch-16oz',
                'size_label' => '16oz',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        Site::query()->insert([
            [
                'name' => 'Amazon',
                'domain' => 'amazon.com',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Walmart',
                'domain' => 'walmart.com',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Target',
                'domain' => 'target.com',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
