<?php

use App\Models\Monster;

it('serves an xml sitemap with public urls', function () {
    $monster = Monster::factory()->create([
        'slug' => 'monster-ultra-seo',
        'active' => true,
    ]);

    $this->get(route('sitemap.xml'))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee('<?xml version="1.0" encoding="UTF-8"?>', false)
        ->assertSee(route('home'), false)
        ->assertSee(route('monsters.show', $monster->slug), false);
});
