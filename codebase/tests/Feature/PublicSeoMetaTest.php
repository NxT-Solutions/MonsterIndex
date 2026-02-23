<?php

it('renders baseline seo tags on the public home page', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('name="description"', false)
        ->assertSee('property="og:title"', false)
        ->assertSee('name="twitter:card"', false)
        ->assertSee('rel="canonical"', false)
        ->assertSee('/brand/monsterindex-og.png', false)
        ->assertSee('application/ld+json', false);
});
