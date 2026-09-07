<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Modules\Accounting\Http\Controllers\ChartOfAccountsController;
use App\Modules\Accounting\Http\Controllers\JournalEntryController;
use App\Modules\Admin\Http\Controllers\AuditLogController;
use App\Modules\Admin\Http\Controllers\BranchController;
use App\Modules\Admin\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public auth
Route::post('/auth/login', [AuthController::class, 'login']);

// Authenticated
// NOTE: Spatie's PermissionMiddleware resolves the current user via
// Auth::guard($guard)->user() with $guard defaulting to null, which falls
// back to config('auth.defaults.guard') = 'web' (session guard) — not the
// 'sanctum' guard this app actually authenticates API tokens with. Every
// `permission:` middleware below MUST therefore pass ",sanctum" explicitly,
// or Spatie will look for a web session, find none, and 401 every request.
Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Branches
    Route::get('/branches', [BranchController::class, 'index'])->middleware('permission:branches.read,sanctum');
    Route::post('/branches', [BranchController::class, 'store'])->middleware('permission:branches.create,sanctum');
    Route::get('/branches/{id}', [BranchController::class, 'show'])->whereNumber('id')->middleware('permission:branches.read,sanctum');
    Route::put('/branches/{id}', [BranchController::class, 'update'])->whereNumber('id')->middleware('permission:branches.update,sanctum');
    Route::delete('/branches/{id}', [BranchController::class, 'destroy'])->whereNumber('id')->middleware('permission:branches.delete,sanctum');
    Route::post('/branches/{id}/activate', [BranchController::class, 'activate'])->whereNumber('id')->middleware('permission:branches.activate,sanctum');
    Route::post('/branches/{id}/deactivate', [BranchController::class, 'deactivate'])->whereNumber('id')->middleware('permission:branches.activate,sanctum');

    // Users
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:users.read,sanctum');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.create,sanctum');
    Route::get('/users/{id}', [UserController::class, 'show'])->whereNumber('id')->middleware('permission:users.read,sanctum');
    Route::put('/users/{id}', [UserController::class, 'update'])->whereNumber('id')->middleware('permission:users.update,sanctum');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->whereNumber('id')->middleware('permission:users.delete,sanctum');

    // Audit logs
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit_logs.read,sanctum');

    // Accounting - Chart of Accounts
    Route::get('/accounting/accounts', [ChartOfAccountsController::class, 'index'])->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/accounts', [ChartOfAccountsController::class, 'store'])->middleware('permission:accounting.create,sanctum');
    Route::get('/accounting/accounts/{id}', [ChartOfAccountsController::class, 'show'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');
    Route::put('/accounting/accounts/{id}', [ChartOfAccountsController::class, 'update'])->whereNumber('id')->middleware('permission:accounting.update,sanctum');

    // Accounting - Journal Entries (no update, no delete)
    Route::get('/accounting/journal-entries', [JournalEntryController::class, 'index'])->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/journal-entries', [JournalEntryController::class, 'store'])->middleware('permission:accounting.post_journal,sanctum');
    Route::get('/accounting/journal-entries/{id}', [JournalEntryController::class, 'show'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');

    // Inventory - Parts
    Route::get('/inventory/parts', [App\Modules\Inventory\Http\Controllers\PartController::class, 'index'])->middleware('permission:inventory.read,sanctum');
    Route::post('/inventory/parts', [App\Modules\Inventory\Http\Controllers\PartController::class, 'store'])->middleware('permission:inventory.create,sanctum');
    Route::get('/inventory/parts/low-stock', [App\Modules\Inventory\Http\Controllers\PartController::class, 'lowStock'])->middleware('permission:inventory.read,sanctum');
    Route::get('/inventory/parts/{id}', [App\Modules\Inventory\Http\Controllers\PartController::class, 'show'])->whereNumber('id')->middleware('permission:inventory.read,sanctum');
    Route::put('/inventory/parts/{id}', [App\Modules\Inventory\Http\Controllers\PartController::class, 'update'])->whereNumber('id')->middleware('permission:inventory.update,sanctum');
    Route::delete('/inventory/parts/{id}', [App\Modules\Inventory\Http\Controllers\PartController::class, 'destroy'])->whereNumber('id')->middleware('permission:inventory.delete,sanctum');
    Route::post('/inventory/parts/{id}/image', [App\Modules\Inventory\Http\Controllers\PartController::class, 'uploadImage'])->whereNumber('id')->middleware('permission:inventory.update,sanctum');

    // Inventory - Categories, Brands, Units (settings master data)
    Route::get('/inventory/categories', [App\Modules\Inventory\Http\Controllers\CategoryController::class, 'index'])->middleware('permission:inventory.read,sanctum');
    Route::post('/inventory/categories', [App\Modules\Inventory\Http\Controllers\CategoryController::class, 'store'])->middleware('permission:inventory.create,sanctum');
    Route::put('/inventory/categories/{id}', [App\Modules\Inventory\Http\Controllers\CategoryController::class, 'update'])->whereNumber('id')->middleware('permission:inventory.update,sanctum');
    Route::delete('/inventory/categories/{id}', [App\Modules\Inventory\Http\Controllers\CategoryController::class, 'destroy'])->whereNumber('id')->middleware('permission:inventory.delete,sanctum');

    Route::get('/inventory/brands', [App\Modules\Inventory\Http\Controllers\BrandController::class, 'index'])->middleware('permission:inventory.read,sanctum');
    Route::post('/inventory/brands', [App\Modules\Inventory\Http\Controllers\BrandController::class, 'store'])->middleware('permission:inventory.create,sanctum');
    Route::put('/inventory/brands/{id}', [App\Modules\Inventory\Http\Controllers\BrandController::class, 'update'])->whereNumber('id')->middleware('permission:inventory.update,sanctum');
    Route::delete('/inventory/brands/{id}', [App\Modules\Inventory\Http\Controllers\BrandController::class, 'destroy'])->whereNumber('id')->middleware('permission:inventory.delete,sanctum');

    Route::get('/inventory/units', [App\Modules\Inventory\Http\Controllers\UnitController::class, 'index'])->middleware('permission:inventory.read,sanctum');
    Route::post('/inventory/units', [App\Modules\Inventory\Http\Controllers\UnitController::class, 'store'])->middleware('permission:inventory.create,sanctum');
    Route::put('/inventory/units/{id}', [App\Modules\Inventory\Http\Controllers\UnitController::class, 'update'])->whereNumber('id')->middleware('permission:inventory.update,sanctum');
    Route::delete('/inventory/units/{id}', [App\Modules\Inventory\Http\Controllers\UnitController::class, 'destroy'])->whereNumber('id')->middleware('permission:inventory.delete,sanctum');

    // Sales - Customers (CRM permissions — customer relationship data)
    Route::get('/sales/customers', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'index'])->middleware('permission:crm.read,sanctum');
    Route::post('/sales/customers', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'store'])->middleware('permission:crm.create,sanctum');
    Route::get('/sales/customers/{id}', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'show'])->whereNumber('id')->middleware('permission:crm.read,sanctum');
    Route::put('/sales/customers/{id}', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'update'])->whereNumber('id')->middleware('permission:crm.update,sanctum');

    // Sales - Invoices
    Route::get('/sales/invoices', [App\Modules\Sales\Http\Controllers\InvoiceController::class, 'index'])->middleware('permission:sales.read,sanctum');
    Route::post('/sales/invoices', [App\Modules\Sales\Http\Controllers\InvoiceController::class, 'store'])->middleware('permission:sales.create,sanctum');
    Route::get('/sales/invoices/{id}', [App\Modules\Sales\Http\Controllers\InvoiceController::class, 'show'])->whereNumber('id')->middleware('permission:sales.read,sanctum');
    Route::post('/sales/invoices/{id}/void', [App\Modules\Sales\Http\Controllers\InvoiceController::class, 'void'])->whereNumber('id')->middleware('permission:sales.approve,sanctum');

    // Sales - Quotations
    Route::get('/sales/quotations', [App\Modules\Sales\Http\Controllers\QuotationController::class, 'index'])->middleware('permission:sales.read,sanctum');
    Route::post('/sales/quotations', [App\Modules\Sales\Http\Controllers\QuotationController::class, 'store'])->middleware('permission:sales.create,sanctum');
    Route::get('/sales/quotations/{id}', [App\Modules\Sales\Http\Controllers\QuotationController::class, 'show'])->whereNumber('id')->middleware('permission:sales.read,sanctum');
    Route::post('/sales/quotations/{id}/convert', [App\Modules\Sales\Http\Controllers\QuotationController::class, 'convert'])->whereNumber('id')->middleware('permission:sales.create,sanctum');

    // HR - Users (people directory)
    Route::get('/hr/users', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'users'])->middleware('permission:hr.read,sanctum');
    Route::get('/hr/users/{id}', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'userDetail'])->whereNumber('id')->middleware('permission:hr.read,sanctum');

    // HR - Employees
    Route::get('/hr/employees', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'index'])->middleware('permission:hr.read,sanctum');
    Route::post('/hr/employees', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'store'])->middleware('permission:hr.create,sanctum');
    Route::get('/hr/employees/{id}', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'show'])->whereNumber('id')->middleware('permission:hr.read,sanctum');
    Route::put('/hr/employees/{id}', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'update'])->whereNumber('id')->middleware('permission:hr.update,sanctum');

    // HR - Expense approval
    Route::post('/hr/expenses/{id}/approve', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'approveExpense'])->whereNumber('id')->middleware('permission:hr.approve,sanctum');

    // CRM - Suppliers (CRM-owned per erp-context/db-schemas/schema.sql module comment)
    Route::get('/crm/suppliers', [App\Modules\Crm\Http\Controllers\SupplierController::class, 'index'])->middleware('permission:crm.read,sanctum');
    Route::post('/crm/suppliers', [App\Modules\Crm\Http\Controllers\SupplierController::class, 'store'])->middleware('permission:crm.create,sanctum');
    Route::get('/crm/suppliers/{id}', [App\Modules\Crm\Http\Controllers\SupplierController::class, 'show'])->whereNumber('id')->middleware('permission:crm.read,sanctum');

    // Purchasing - Purchase Invoices (creates FIFO stock_entries on stock-in)
    Route::get('/purchasing/invoices', [App\Modules\Purchasing\Http\Controllers\PurchaseInvoiceController::class, 'index'])->middleware('permission:purchasing.read,sanctum');
    Route::post('/purchasing/invoices', [App\Modules\Purchasing\Http\Controllers\PurchaseInvoiceController::class, 'store'])->middleware('permission:purchasing.create,sanctum');
    Route::get('/purchasing/invoices/{id}', [App\Modules\Purchasing\Http\Controllers\PurchaseInvoiceController::class, 'show'])->whereNumber('id')->middleware('permission:purchasing.read,sanctum');

    // Purchasing - Purchase Returns (debit notes, LIFO stock reversal)
    Route::get('/purchasing/returns', [App\Modules\Purchasing\Http\Controllers\PurchaseReturnController::class, 'index'])->middleware('permission:purchasing.read,sanctum');
    Route::post('/purchasing/returns', [App\Modules\Purchasing\Http\Controllers\PurchaseReturnController::class, 'store'])->middleware('permission:purchasing.create,sanctum');
    Route::get('/purchasing/returns/{id}', [App\Modules\Purchasing\Http\Controllers\PurchaseReturnController::class, 'show'])->whereNumber('id')->middleware('permission:purchasing.read,sanctum');
});
