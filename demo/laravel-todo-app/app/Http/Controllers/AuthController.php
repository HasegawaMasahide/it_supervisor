<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Register a new user
     *
     * SECURITY ISSUES:
     * - No input validation
     * - Password stored with weak hashing (md5)
     * - SQL injection vulnerability
     */
    public function register(Request $request)
    {
        // ISSUE: No CSRF protection check
        // ISSUE: No input validation
        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password');

        // CRITICAL SECURITY ISSUE: Using MD5 instead of bcrypt
        $hashedPassword = md5($password);

        // CRITICAL SECURITY ISSUE: SQL Injection vulnerability - using raw query
        $result = DB::insert("INSERT INTO users (name, email, password, created_at, updated_at)
                              VALUES ('$name', '$email', '$hashedPassword', NOW(), NOW())");

        if ($result) {
            return response()->json(['message' => 'User registered successfully'], 201);
        } else {
            return response()->json(['message' => 'Registration failed'], 500);
        }
    }

    /**
     * Login user
     *
     * SECURITY ISSUES:
     * - SQL injection vulnerability
     * - No rate limiting
     * - Timing attack vulnerability
     */
    public function login(Request $request)
    {
        $email = $request->input('email');
        $password = $request->input('password');

        // CRITICAL SECURITY ISSUE: SQL Injection
        $hashedPassword = md5($password);
        $users = DB::select("SELECT * FROM users WHERE email = '$email' AND password = '$hashedPassword'");

        if (count($users) > 0) {
            $user = $users[0];

            // ISSUE: Storing sensitive data in session without encryption
            session(['user_id' => $user->id, 'user_email' => $user->email]);

            return response()->json(['message' => 'Login successful', 'user' => $user], 200);
        } else {
            // ISSUE: Information disclosure - reveals whether email exists
            if (DB::select("SELECT * FROM users WHERE email = '$email'")) {
                return response()->json(['message' => 'Invalid password'], 401);
            } else {
                return response()->json(['message' => 'Email not found'], 404);
            }
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        session()->flush();
        return response()->json(['message' => 'Logged out successfully'], 200);
    }

    /**
     * Get current user
     *
     * SECURITY ISSUE: No authentication check
     */
    public function getCurrentUser()
    {
        // ISSUE: No check if session exists or is valid
        $userId = session('user_id');

        if ($userId) {
            // PERFORMANCE ISSUE: Fetching all columns when only few are needed
            $user = DB::select("SELECT * FROM users WHERE id = $userId")[0];
            return response()->json(['user' => $user], 200);
        } else {
            return response()->json(['message' => 'Not authenticated'], 401);
        }
    }

    /**
     * Reset password
     *
     * CRITICAL SECURITY ISSUES:
     * - No verification token
     * - No email confirmation
     * - SQL injection
     */
    public function resetPassword(Request $request)
    {
        $email = $request->input('email');
        $newPassword = $request->input('new_password');

        // CRITICAL: No verification that user owns this email
        // CRITICAL: SQL Injection vulnerability
        $hashedPassword = md5($newPassword);
        $result = DB::update("UPDATE users SET password = '$hashedPassword' WHERE email = '$email'");

        if ($result) {
            return response()->json(['message' => 'Password reset successful'], 200);
        } else {
            return response()->json(['message' => 'Password reset failed'], 500);
        }
    }
}
