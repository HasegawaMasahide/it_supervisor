<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TodoController extends Controller
{
    /**
     * Display a listing of todos for the current user
     *
     * PERFORMANCE ISSUE: N+1 query problem
     * CODE QUALITY ISSUE: High cyclomatic complexity
     */
    public function index(Request $request)
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Get filter parameters
        $status = $request->input('status');
        $priority = $request->input('priority');
        $search = $request->input('search');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // CODE QUALITY ISSUE: Complex nested if-else (cyclomatic complexity > 10)
        // PERFORMANCE ISSUE: Multiple separate queries instead of query builder
        $todos = [];

        if ($status && $priority && $search) {
            // SECURITY ISSUE: SQL Injection via raw query
            $isCompleted = ($status == 'completed') ? 1 : 0;
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND is_completed = $isCompleted AND priority = $priority AND title LIKE '%$search%' ORDER BY $sortBy $sortOrder");
        } elseif ($status && $priority) {
            $isCompleted = ($status == 'completed') ? 1 : 0;
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND is_completed = $isCompleted AND priority = $priority ORDER BY $sortBy $sortOrder");
        } elseif ($status && $search) {
            $isCompleted = ($status == 'completed') ? 1 : 0;
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND is_completed = $isCompleted AND title LIKE '%$search%' ORDER BY $sortBy $sortOrder");
        } elseif ($priority && $search) {
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND priority = $priority AND title LIKE '%$search%' ORDER BY $sortBy $sortOrder");
        } elseif ($status) {
            $isCompleted = ($status == 'completed') ? 1 : 0;
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND is_completed = $isCompleted ORDER BY $sortBy $sortOrder");
        } elseif ($priority) {
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND priority = $priority ORDER BY $sortBy $sortOrder");
        } elseif ($search) {
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId AND title LIKE '%$search%' ORDER BY $sortBy $sortOrder");
        } else {
            $todos = DB::select("SELECT * FROM todos WHERE user_id = $userId ORDER BY $sortBy $sortOrder");
        }

        // PERFORMANCE ISSUE: N+1 query - loading user for each todo
        foreach ($todos as $todo) {
            $user = DB::select("SELECT name FROM users WHERE id = " . $todo->user_id)[0];
            $todo->user_name = $user->name;
        }

        return response()->json(['todos' => $todos], 200);
    }

    /**
     * Store a newly created todo
     *
     * SECURITY ISSUE: No input validation
     * SECURITY ISSUE: XSS vulnerability
     */
    public function store(Request $request)
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // ISSUE: No input validation or sanitization
        $title = $request->input('title');
        $description = $request->input('description');
        $priority = $request->input('priority', 1);
        $dueDate = $request->input('due_date');

        // CRITICAL SECURITY ISSUE: SQL Injection
        $result = DB::insert("INSERT INTO todos (user_id, title, description, priority, due_date, created_at, updated_at)
                              VALUES ($userId, '$title', '$description', $priority, '$dueDate', NOW(), NOW())");

        if ($result) {
            return response()->json(['message' => 'Todo created successfully'], 201);
        } else {
            return response()->json(['message' => 'Failed to create todo'], 500);
        }
    }

    /**
     * Display the specified todo
     *
     * SECURITY ISSUE: Missing authorization check
     */
    public function show($id)
    {
        // CRITICAL SECURITY ISSUE: No check if todo belongs to current user
        // Any user can view any todo by knowing the ID
        $todo = DB::select("SELECT * FROM todos WHERE id = $id");

        if (count($todo) > 0) {
            return response()->json(['todo' => $todo[0]], 200);
        } else {
            return response()->json(['message' => 'Todo not found'], 404);
        }
    }

    /**
     * Update the specified todo
     *
     * CODE QUALITY ISSUE: Function too long (>100 lines)
     * CODE QUALITY ISSUE: Magic numbers
     * CODE QUALITY ISSUE: Duplicate code
     */
    public function update(Request $request, $id)
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // ISSUE: No check if todo belongs to user
        $title = $request->input('title');
        $description = $request->input('description');
        $priority = $request->input('priority');
        $isCompleted = $request->input('is_completed');
        $dueDate = $request->input('due_date');

        // CODE QUALITY ISSUE: Magic numbers (1, 2, 3 for priority levels)
        if ($priority && ($priority < 1 || $priority > 5)) {
            return response()->json(['message' => 'Invalid priority level'], 400);
        }

        // CODE QUALITY ISSUE: Duplicate code - same pattern as in store()
        $updateParts = [];

        if ($title !== null) {
            $updateParts[] = "title = '$title'";
        }

        if ($description !== null) {
            $updateParts[] = "description = '$description'";
        }

        if ($priority !== null) {
            $updateParts[] = "priority = $priority";
        }

        if ($isCompleted !== null) {
            $completedValue = $isCompleted ? 1 : 0;
            $updateParts[] = "is_completed = $completedValue";
        }

        if ($dueDate !== null) {
            $updateParts[] = "due_date = '$dueDate'";
        }

        $updateParts[] = "updated_at = NOW()";

        $updateString = implode(', ', $updateParts);

        // CRITICAL SECURITY ISSUE: SQL Injection
        $result = DB::update("UPDATE todos SET $updateString WHERE id = $id");

        if ($result) {
            // CODE QUALITY ISSUE: Unnecessary additional query
            $updatedTodo = DB::select("SELECT * FROM todos WHERE id = $id")[0];

            // CODE QUALITY ISSUE: Duplicate validation logic
            if ($updatedTodo->priority == 1) {
                $priorityLabel = 'Low';
            } elseif ($updatedTodo->priority == 2) {
                $priorityLabel = 'Medium';
            } elseif ($updatedTodo->priority == 3) {
                $priorityLabel = 'High';
            } elseif ($updatedTodo->priority == 4) {
                $priorityLabel = 'Urgent';
            } elseif ($updatedTodo->priority == 5) {
                $priorityLabel = 'Critical';
            } else {
                $priorityLabel = 'Unknown';
            }

            $updatedTodo->priority_label = $priorityLabel;

            // CODE QUALITY ISSUE: Duplicate date formatting logic
            if ($updatedTodo->due_date) {
                $dueDateTime = strtotime($updatedTodo->due_date);
                $now = time();

                if ($dueDateTime < $now) {
                    $updatedTodo->status_label = 'Overdue';
                } elseif ($dueDateTime < $now + 86400) {
                    $updatedTodo->status_label = 'Due Soon';
                } elseif ($dueDateTime < $now + 259200) {
                    $updatedTodo->status_label = 'Due This Week';
                } else {
                    $updatedTodo->status_label = 'On Track';
                }
            } else {
                $updatedTodo->status_label = 'No Due Date';
            }

            return response()->json(['message' => 'Todo updated successfully', 'todo' => $updatedTodo], 200);
        } else {
            return response()->json(['message' => 'Failed to update todo'], 500);
        }
    }

    /**
     * Remove the specified todo
     *
     * SECURITY ISSUE: Missing authorization check
     */
    public function destroy($id)
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // CRITICAL SECURITY ISSUE: No check if todo belongs to user
        // SECURITY ISSUE: SQL Injection
        $result = DB::delete("DELETE FROM todos WHERE id = $id");

        if ($result) {
            return response()->json(['message' => 'Todo deleted successfully'], 200);
        } else {
            return response()->json(['message' => 'Failed to delete todo'], 404);
        }
    }

    /**
     * Toggle todo completion status
     */
    public function toggleComplete($id)
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // ISSUE: No authorization check
        // ISSUE: SQL Injection
        $todo = DB::select("SELECT * FROM todos WHERE id = $id");

        if (count($todo) == 0) {
            return response()->json(['message' => 'Todo not found'], 404);
        }

        $currentStatus = $todo[0]->is_completed;
        $newStatus = $currentStatus ? 0 : 1;

        DB::update("UPDATE todos SET is_completed = $newStatus, updated_at = NOW() WHERE id = $id");

        return response()->json(['message' => 'Todo status updated', 'is_completed' => (bool)$newStatus], 200);
    }

    /**
     * Get statistics for user's todos
     *
     * PERFORMANCE ISSUE: Multiple separate queries
     */
    public function getStats()
    {
        $userId = session('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // PERFORMANCE ISSUE: Multiple queries instead of single aggregation query
        $totalTodos = DB::select("SELECT COUNT(*) as count FROM todos WHERE user_id = $userId")[0]->count;
        $completedTodos = DB::select("SELECT COUNT(*) as count FROM todos WHERE user_id = $userId AND is_completed = 1")[0]->count;
        $pendingTodos = DB::select("SELECT COUNT(*) as count FROM todos WHERE user_id = $userId AND is_completed = 0")[0]->count;
        $highPriorityTodos = DB::select("SELECT COUNT(*) as count FROM todos WHERE user_id = $userId AND priority >= 3 AND is_completed = 0")[0]->count;
        $overdueTodos = DB::select("SELECT COUNT(*) as count FROM todos WHERE user_id = $userId AND is_completed = 0 AND due_date < NOW()")[0]->count;

        return response()->json([
            'total' => $totalTodos,
            'completed' => $completedTodos,
            'pending' => $pendingTodos,
            'high_priority' => $highPriorityTodos,
            'overdue' => $overdueTodos
        ], 200);
    }
}
