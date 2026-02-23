<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware('auth')->name('dashboard');

Route::get('/admin', function () {
    return Inertia::render('Admin/Dashboard');
})->middleware(['auth', 'admin'])->name('admin.dashboard');

require __DIR__.'/auth.php';
