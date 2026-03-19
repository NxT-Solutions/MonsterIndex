<?php

use Inertia\Testing\AssertableInertia as Assert;

it('shares all configured locales with inertia', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('<html lang="en">', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale.current', 'en')
            ->where('locale.fallback', 'en')
            ->where('locale.cookie_name', 'monsterindex_locale')
            ->has('locale.supported', 5)
            ->where('locale.supported.0.code', 'en')
            ->where('locale.supported.1.code', 'nl')
            ->where('locale.supported.2.code', 'fr')
            ->where('locale.supported.3.code', 'es')
            ->where('locale.supported.4.code', 'de')
            ->where('locale.supported.2.bcp47', 'fr-FR')
            ->where('locale.supported.3.native_name', 'Español')
            ->where('locale.supported.4.native_name', 'Deutsch'));
});

it('lets the lang query override the locale cookie', function () {
    $this->withCookie(config('locales.cookie_name', 'monsterindex_locale'), 'fr')
        ->get(route('home', ['lang' => 'es']))
        ->assertOk()
        ->assertSee('<html lang="es">', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale.current', 'es'));
});

it('resolves the locale from the accept-language header when needed', function () {
    $this->withHeader('Accept-Language', 'de-DE,de;q=0.9,en;q=0.8')
        ->get(route('home'))
        ->assertOk()
        ->assertSee('<html lang="de">', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale.current', 'de'));
});

it('injects the selected locale bundle into the bookmarklet script', function () {
    $this->get(route('bookmarklet.script', ['lang' => 'fr']))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/javascript; charset=UTF-8')
        ->assertSee('const __monsterindexLocale = "fr";', false)
        ->assertSee("const language =\n    typeof __monsterindexLocale === 'string' && __monsterindexLocale !== ''\n      ? __monsterindexLocale\n      : scriptUrl.searchParams.get('lang') || 'en';", false)
        ->assertSee('const __monsterindexLocaleMessages =', false);
});
