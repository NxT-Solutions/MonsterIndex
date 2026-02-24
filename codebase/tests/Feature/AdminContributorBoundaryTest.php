<?php

use App\Models\Monitor;
use App\Models\Monster;
use App\Models\Site;
use App\Models\User;
use App\Support\Authorization\PermissionBootstrapper;

it('redirects admins away from contributor pages', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $this->actingAs($admin)
        ->get(route('contribute.monitors.index'))
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($admin)
        ->get(route('contribute.suggestions.index'))
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($admin)
        ->get(route('contribute.follows.index'))
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($admin)
        ->get(route('contribute.alerts.index'))
        ->assertRedirect(route('admin.dashboard'));
});

it('forbids admins from contributor actions', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monster = Monster::factory()->create();
    $site = Site::factory()->create();

    $this->actingAs($admin)
        ->post(route('contribute.monitors.store'), [
            'monster_id' => $monster->id,
            'site_id' => $site->id,
            'product_url' => 'https://example.test/product/forbidden-admin',
            'currency' => 'EUR',
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('contribute.suggestions.store'), [
            'name' => 'Monster Admin Boundary 500ml',
            'size_label' => '500ml',
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('monsters.follow.store', $monster->slug), [
            'currency' => 'EUR',
        ])
        ->assertForbidden();
});

it('still allows admins to access bookmarklet session tooling', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    PermissionBootstrapper::syncUserRole($admin, true);

    $monitor = Monitor::factory()->create([
        'created_by_user_id' => User::factory()->create()->id,
        'submission_status' => Monitor::STATUS_APPROVED,
        'active' => true,
    ]);

    $this->actingAs($admin)
        ->postJson(route('api.bookmarklet.session'), [
            'monitor_id' => $monitor->id,
            'lang' => 'en',
        ])
        ->assertOk()
        ->assertJsonPath('token', fn ($value) => is_string($value) && $value !== '')
        ->assertJsonPath('selector_browser_url', fn ($value) => is_string($value) && $value !== '');
});
