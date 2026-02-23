<?php

use App\Models\User;

it('forbids non-admin users from the admin dashboard', function () {
    $user = User::factory()->create([
        'role' => User::ROLE_USER,
    ]);

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

it('allows admin users to access the admin dashboard', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk();
});
