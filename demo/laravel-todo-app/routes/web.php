<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', function () {
    return view('welcome');
});

// SECURITY ISSUE: XSS vulnerability - displaying user input without escaping
Route::get('/hello/{name}', function ($name) {
    // CRITICAL: No input sanitization, allows XSS
    return "<h1>Hello, $name!</h1><p>Welcome to our TODO app.</p>";
});

// SECURITY ISSUE: Path traversal vulnerability
Route::get('/download/{filename}', function ($filename) {
    // CRITICAL: No path validation, allows directory traversal
    $filePath = storage_path('app/downloads/' . $filename);

    if (file_exists($filePath)) {
        return response()->download($filePath);
    } else {
        return response('File not found', 404);
    }
});
