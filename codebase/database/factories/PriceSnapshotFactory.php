<?php

namespace Database\Factories;

use App\Models\Monitor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PriceSnapshot>
 */
class PriceSnapshotFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->numberBetween(100, 3500);
        $shipping = fake()->numberBetween(0, 600);

        return [
            'monitor_id' => Monitor::factory(),
            'checked_at' => now(),
            'price_cents' => $price,
            'shipping_cents' => $shipping,
            'effective_total_cents' => $price + $shipping,
            'can_count' => 12,
            'price_per_can_cents' => (int) round(($price + $shipping) / 12),
            'currency' => 'EUR',
            'availability' => 'in_stock',
            'raw_text' => '$'.number_format(($price + $shipping) / 100, 2),
            'status' => 'ok',
            'error_code' => null,
        ];
    }
}
