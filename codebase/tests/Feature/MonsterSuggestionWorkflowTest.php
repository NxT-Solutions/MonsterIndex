<?php

use App\Models\Monster;
use App\Models\MonsterSuggestion;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;

it('supports monster suggestion submission and admin approval flow', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($contributor, false);
    PermissionBootstrapper::syncUserRole($admin, true);

    $this->actingAs($contributor)
        ->post(route('contribute.suggestions.store'), [
            'name' => 'Monster Nitro Cosmic Peach 16oz',
            'size_label' => '16oz',
            'notes' => 'Popular in nearby stores.',
        ])
        ->assertRedirect();

    $suggestion = MonsterSuggestion::query()->first();
    expect($suggestion)->not->toBeNull()
        ->and($suggestion?->status)->toBe(MonsterSuggestion::STATUS_PENDING);

    $this->actingAs($admin)
        ->post(route('admin.review.suggestions.approve', $suggestion), [
            'review_note' => 'Fits the catalog scope.',
        ])
        ->assertRedirect();

    $suggestion->refresh();
    $monster = Monster::query()->where('name', 'Monster Nitro Cosmic Peach 16oz')->first();
    expect($monster)->not->toBeNull();
    expect($suggestion->status)->toBe(MonsterSuggestion::STATUS_APPROVED)
        ->and((int) $suggestion->monster_id)->toBe((int) $monster?->id);
});

it('blocks duplicate suggestions by normalized name while pending or approved exists', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    MonsterSuggestion::factory()->create([
        'user_id' => $contributor->id,
        'name' => 'Monster Reserve Kiwi Strawberry 16oz',
        'normalized_name' => 'monster reserve kiwi strawberry 16oz',
        'status' => MonsterSuggestion::STATUS_PENDING,
    ]);

    $this->actingAs($contributor)
        ->post(route('contribute.suggestions.store'), [
            'name' => '  MONSTER   reserve kiwi strawberry 16oz ',
            'size_label' => '16oz',
        ])
        ->assertSessionHasErrors('name');
});

it('throttles suggestion creation after the daily limit', function () {
    $contributor = User::factory()->create(['role' => User::ROLE_USER]);
    PermissionBootstrapper::syncUserRole($contributor, false);

    foreach (range(1, 3) as $attempt) {
        $this->actingAs($contributor)
            ->post(route('contribute.suggestions.store'), [
                'name' => "Monster Test Suggestion {$attempt}",
                'size_label' => '16oz',
            ])
            ->assertRedirect();
    }

    $this->actingAs($contributor)
        ->post(route('contribute.suggestions.store'), [
            'name' => 'Monster Test Suggestion Overflow',
            'size_label' => '16oz',
        ])
        ->assertStatus(429);
});
