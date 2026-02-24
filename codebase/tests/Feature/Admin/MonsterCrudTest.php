<?php

use App\Models\User;

it('allows admin to create a monster', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.monsters.store'), [
            'name' => 'Monster Test Zero',
            'slug' => 'monster-test-zero',
            'size_label' => '500ml',
            'active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('monsters', [
        'name' => 'Monster Test Zero',
        'slug' => 'monster-test-zero',
    ]);
});
