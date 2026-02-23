<?php

use App\Models\Monitor;
use App\Models\Site;
use App\Models\User;

it('allows admin to access store management', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.stores.index'))
        ->assertOk();
});

it('allows admin to create a store', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.stores.store'), [
            'name' => 'Small Energy Shop',
            'domain' => 'https://shop.smallenergy.example/products/monster-ultra',
            'active' => true,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('sites', [
        'name' => 'Small Energy Shop',
        'domain' => 'shop.smallenergy.example',
        'active' => true,
    ]);
});

it('allows admin to update a store', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    $store = Site::factory()->create([
        'name' => 'Old Name',
        'domain' => 'old-shop.example',
        'active' => true,
    ]);

    $this->actingAs($admin)
        ->put(route('admin.stores.update', $store->id), [
            'name' => 'New Name',
            'domain' => 'new-shop.example',
            'active' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('sites', [
        'id' => $store->id,
        'name' => 'New Name',
        'domain' => 'new-shop.example',
        'active' => false,
    ]);
});

it('allows admin to delete a store without monitors', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    $store = Site::factory()->create();

    $this->actingAs($admin)
        ->delete(route('admin.stores.destroy', $store->id))
        ->assertRedirect();

    $this->assertDatabaseMissing('sites', [
        'id' => $store->id,
    ]);
});

it('does not allow deleting a store that still has monitors', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
    $store = Site::factory()->create();
    Monitor::factory()->create([
        'site_id' => $store->id,
    ]);

    $this->actingAs($admin)
        ->from(route('admin.stores.index'))
        ->delete(route('admin.stores.destroy', $store->id))
        ->assertRedirect(route('admin.stores.index'))
        ->assertSessionHasErrors('site');

    $this->assertDatabaseHas('sites', [
        'id' => $store->id,
    ]);
});
