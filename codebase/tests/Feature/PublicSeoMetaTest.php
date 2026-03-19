<?php

it('renders baseline seo tags on the public home page', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('name="description"', false)
        ->assertSee('property="og:title"', false)
        ->assertSee('name="twitter:card"', false)
        ->assertSee('rel="canonical"', false)
        ->assertSee('rel="manifest" href="/site.webmanifest"', false)
        ->assertSee('name="mobile-web-app-capable" content="yes"', false)
        ->assertSee('name="apple-mobile-web-app-capable" content="yes"', false)
        ->assertSee('name="apple-mobile-web-app-title" content="MonsterIndex"', false)
        ->assertSee('/brand/monsterindex-og.png', false)
        ->assertSee('application/ld+json', false);
});
