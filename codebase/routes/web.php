<?php

use Packages\Admin\Http\Controllers\AlertController as AdminAlertController;
use Packages\Admin\Http\Controllers\BookmarkletController as AdminBookmarkletController;
use Packages\Admin\Http\Controllers\MonitorController as AdminMonitorController;
use Packages\Admin\Http\Controllers\MonsterController as AdminMonsterController;
use Packages\Admin\Http\Controllers\SiteController as AdminSiteController;
use Packages\PublicBoard\Http\Controllers\HomeController;
use Packages\PublicBoard\Http\Controllers\MonsterController as PublicMonsterController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/monsters/{monster:slug}', [PublicMonsterController::class, 'show'])->name('monsters.show');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware('auth')->name('dashboard');

Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('admin.dashboard');

    Route::get('/admin/monsters', [AdminMonsterController::class, 'index'])->name('admin.monsters.index');
    Route::post('/admin/monsters', [AdminMonsterController::class, 'store'])->name('admin.monsters.store');
    Route::put('/admin/monsters/{monster}', [AdminMonsterController::class, 'update'])->name('admin.monsters.update');
    Route::delete('/admin/monsters/{monster}', [AdminMonsterController::class, 'destroy'])->name('admin.monsters.destroy');

    Route::get('/admin/sites', [AdminSiteController::class, 'index'])->name('admin.sites.index');
    Route::post('/admin/sites', [AdminSiteController::class, 'store'])->name('admin.sites.store');
    Route::put('/admin/sites/{site}', [AdminSiteController::class, 'update'])->name('admin.sites.update');
    Route::delete('/admin/sites/{site}', [AdminSiteController::class, 'destroy'])->name('admin.sites.destroy');

    Route::get('/admin/monitors', [AdminMonitorController::class, 'index'])->name('admin.monitors.index');
    Route::post('/admin/monitors', [AdminMonitorController::class, 'store'])->name('admin.monitors.store');
    Route::put('/admin/monitors/{monitor}', [AdminMonitorController::class, 'update'])->name('admin.monitors.update');
    Route::delete('/admin/monitors/{monitor}', [AdminMonitorController::class, 'destroy'])->name('admin.monitors.destroy');

    Route::get('/admin/alerts', [AdminAlertController::class, 'index'])->name('admin.alerts.index');
    Route::post('/admin/alerts/{alert}/read', [AdminAlertController::class, 'markRead'])->name('admin.alerts.mark-read');

    Route::post('/api/bookmarklet/session', [AdminBookmarkletController::class, 'session'])->name('api.bookmarklet.session');
    Route::post('/api/admin/monitors/{monitor}/run-now', [AdminMonitorController::class, 'runNow'])->name('api.admin.monitors.run-now');
});

Route::get('/bookmarklet/selector.js', [AdminBookmarkletController::class, 'script'])->name('bookmarklet.script');

require __DIR__.'/auth.php';
