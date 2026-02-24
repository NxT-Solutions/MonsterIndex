<?php

namespace Database\Factories;

use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Monitor>
 */
class MonitorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'monster_id' => Monster::factory(),
            'site_id' => Site::factory(),
            'created_by_user_id' => User::factory(),
            'approved_by_user_id' => User::factory(),
            'product_url' => fake()->url(),
            'canonical_product_url' => fake()->url(),
            'selector_config' => [
                'price' => [
                    'css' => '.price',
                    'xpath' => '//*[@class="price"]',
                    'sample_text' => '$19.99',
                ],
                'shipping' => [
                    'css' => '.shipping',
                    'xpath' => '//*[@class="shipping"]',
                    'sample_text' => '$4.99',
                ],
            ],
            'currency' => 'EUR',
            'check_interval_minutes' => 60,
            'next_check_at' => now(),
            'active' => true,
            'submission_status' => 'approved',
            'approved_at' => now(),
            'rejected_at' => null,
            'review_note' => null,
            'validation_status' => 'success',
            'validation_checked_at' => now(),
            'validation_result' => [
                'status' => 'ok',
            ],
        ];
    }
}
