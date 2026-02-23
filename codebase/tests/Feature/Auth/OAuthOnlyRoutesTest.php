<?php

it('does not expose password or registration routes', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register')->assertNotFound();
    $this->get('/forgot-password')->assertNotFound();
    $this->get('/reset-password/token')->assertNotFound();
    $this->get('/verify-email')->assertNotFound();
    $this->get('/confirm-password')->assertNotFound();
});

it('keeps login and public routes available', function () {
    $this->get('/')->assertOk();
    $this->get('/login')->assertOk();
});
