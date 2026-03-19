<?php

use App\Models\Monster;

it('loads the monster catalog fixture during migrations', function () {
    expect(Monster::query()->count())->toBe(96);

    $this->assertDatabaseHas('monsters', [
        'name' => 'Monster Energy',
        'slug' => 'monster-energy',
        'size_label' => '500ml',
        'active' => true,
    ]);

    $this->assertDatabaseHas('monsters', [
        'name' => 'Java Mean Bean',
        'slug' => 'monster-java-mean-bean',
        'size_label' => '444ml',
        'active' => true,
    ]);

    $this->assertDatabaseHas('monsters', [
        'name' => 'Hydro Manic Melon',
        'slug' => 'monster-hydro-manic-melon',
        'size_label' => '550ml',
        'active' => true,
    ]);
});
