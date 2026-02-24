<?php

namespace Database\Factories;

use App\Models\MonsterSuggestion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MonsterSuggestion>
 */
class MonsterSuggestionFactory extends Factory
{
    /**
     * @var class-string<MonsterSuggestion>
     */
    protected $model = MonsterSuggestion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sizeLabel = fake()->randomElement(['355ml', '500ml', '710ml']);
        $name = 'Monster '.fake()->unique()->word().' '.$sizeLabel;

        return [
            'user_id' => User::factory(),
            'name' => $name,
            'normalized_name' => mb_strtolower(trim($name)),
            'size_label' => fake()->randomElement([$sizeLabel, null]),
            'notes' => fake()->optional()->sentence(),
            'status' => MonsterSuggestion::STATUS_PENDING,
            'reviewed_by_user_id' => null,
            'monster_id' => null,
            'reviewed_at' => null,
            'review_note' => null,
        ];
    }
}
