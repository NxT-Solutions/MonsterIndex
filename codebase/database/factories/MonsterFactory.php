<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Monster>
 */
class MonsterFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = sprintf('Monster %s %soz', fake()->word(), fake()->numberBetween(12, 24));

        return [
            'name' => $name,
            'slug' => str($name)->slug()->toString().'-'.fake()->unique()->numberBetween(100, 999),
            'size_label' => fake()->randomElement(['12oz', '16oz', '24oz']),
            'active' => true,
        ];
    }
}
