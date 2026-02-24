<?php

namespace Database\Seeders;

use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;
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
        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'you@example.com',
            'google_id' => 'seed-admin-google-id',
            'role' => 'admin',
        ]);

        $contributors = User::factory()->count(2)->create();

        PermissionBootstrapper::syncUserRole($admin, true);
        foreach ($contributors as $contributor) {
            PermissionBootstrapper::syncUserRole($contributor, false);
        }

        Monster::query()->insert([
            [
                'name' => 'Monster Energy Original 500ml',
                'slug' => 'monster-energy-original-500ml',
                'size_label' => '500ml',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Monster Ultra White 500ml',
                'slug' => 'monster-ultra-white-500ml',
                'size_label' => '500ml',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Monster Pipeline Punch 500ml',
                'slug' => 'monster-pipeline-punch-500ml',
                'size_label' => '500ml',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        Site::query()->insert([
            [
                'name' => 'Amazon BE',
                'domain' => 'amazon.com.be',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Delhaize',
                'domain' => 'delhaize.be',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
