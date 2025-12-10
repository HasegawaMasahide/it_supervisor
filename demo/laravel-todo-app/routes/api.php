<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TodoController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// SECURITY ISSUE: No rate limiting on authentication endpoints
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/user', [AuthController::class, 'getCurrentUser']);

// SECURITY ISSUE: No authentication middleware on protected routes
// These should be behind auth middleware but aren't
Route::get('/todos', [TodoController::class, 'index']);
Route::post('/todos', [TodoController::class, 'store']);
Route::get('/todos/{id}', [TodoController::class, 'show']);
Route::put('/todos/{id}', [TodoController::class, 'update']);
Route::delete('/todos/{id}', [TodoController::class, 'destroy']);
Route::post('/todos/{id}/toggle', [TodoController::class, 'toggleComplete']);
Route::get('/todos/stats/summary', [TodoController::class, 'getStats']);

// SECURITY ISSUE: Debug endpoint exposed in production
Route::get('/debug/phpinfo', function() {
    phpinfo();
});

// SECURITY ISSUE: Database credentials exposed
Route::get('/debug/config', function() {
    return response()->json([
        'database' => config('database'),
        'app_key' => config('app.key'),
    ]);
});
