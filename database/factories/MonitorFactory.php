<?php

namespace Database\Factories;

use App\Models\Monster;
use App\Models\Site;
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
            'product_url' => fake()->url(),
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
            'currency' => 'USD',
            'check_interval_minutes' => 60,
            'next_check_at' => now(),
            'active' => true,
        ];
    }
}
