<?php

use Packages\Admin\Http\Controllers\AlertController as AdminAlertController;
use Packages\Admin\Http\Controllers\BookmarkletController as AdminBookmarkletController;
use Packages\Admin\Http\Controllers\DashboardController as AdminDashboardController;
use Packages\Admin\Http\Controllers\MonitorController as AdminMonitorController;
use Packages\Admin\Http\Controllers\MonsterController as AdminMonsterController;
use Packages\PublicBoard\Http\Controllers\HomeController;
use Packages\PublicBoard\Http\Controllers\MonsterController as PublicMonsterController;
use Packages\PublicBoard\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/monsters/{monster:slug}', [PublicMonsterController::class, 'show'])->name('monsters.show');
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap.xml');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware('auth')->name('dashboard');

Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin', [AdminDashboardController::class, 'index'])->name('admin.dashboard');

    Route::get('/admin/monsters', [AdminMonsterController::class, 'index'])->name('admin.monsters.index');
    Route::get('/admin/monsters/{monster:slug}', [AdminMonsterController::class, 'show'])->name('admin.monsters.show');
    Route::post('/admin/monsters', [AdminMonsterController::class, 'store'])->name('admin.monsters.store');
    Route::put('/admin/monsters/{monster}', [AdminMonsterController::class, 'update'])->name('admin.monsters.update');
    Route::delete('/admin/monsters/{monster}', [AdminMonsterController::class, 'destroy'])->name('admin.monsters.destroy');
    Route::post('/admin/monsters/{monster}/records', [AdminMonsterController::class, 'storeRecord'])->name('admin.monsters.records.store');

    Route::get('/admin/monitors', [AdminMonitorController::class, 'index'])->name('admin.monitors.index');
    Route::post('/admin/monitors', [AdminMonitorController::class, 'store'])->name('admin.monitors.store');
    Route::put('/admin/monitors/{monitor}', [AdminMonitorController::class, 'update'])->name('admin.monitors.update');
    Route::delete('/admin/monitors/{monitor}', [AdminMonitorController::class, 'destroy'])->name('admin.monitors.destroy');
    Route::get('/admin/monitors/{monitor}/selector-browser', [AdminBookmarkletController::class, 'selectorBrowser'])->name('admin.monitors.selector-browser');

    Route::get('/admin/alerts', [AdminAlertController::class, 'index'])->name('admin.alerts.index');
    Route::post('/admin/alerts/{alert}/read', [AdminAlertController::class, 'markRead'])->name('admin.alerts.mark-read');

    Route::post('/api/bookmarklet/session', [AdminBookmarkletController::class, 'session'])->name('api.bookmarklet.session');
    Route::post('/api/admin/monitors/{monitor}/run-now', [AdminMonitorController::class, 'runNow'])->name('api.admin.monitors.run-now');
    Route::get('/api/admin/monsters/{monster:slug}/records/events', [AdminMonsterController::class, 'recordsEvents'])->name('api.admin.monsters.records.events');
});

Route::get('/bookmarklet/selector.js', [AdminBookmarkletController::class, 'script'])->name('bookmarklet.script');

require __DIR__.'/auth.php';
