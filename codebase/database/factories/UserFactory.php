<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'google_id' => (string) Str::uuid(),
            'avatar_url' => fake()->imageUrl(256, 256, 'people'),
            'role' => 'user',
            'password' => null,
            'remember_token' => Str::random(10),
        ];
    }
}
