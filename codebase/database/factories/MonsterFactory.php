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
        $sizeLabel = fake()->randomElement(['355ml', '500ml', '710ml']);
        $name = sprintf('Monster %s %s', fake()->word(), $sizeLabel);

        return [
            'name' => $name,
            'slug' => str($name)->slug()->toString().'-'.fake()->unique()->numberBetween(100, 999),
            'size_label' => $sizeLabel,
            'active' => true,
        ];
    }
}
