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

    // Accounting - Reports (AR/AP aging, General Ledger view)
    Route::get('/accounting/receivables', [App\Modules\Accounting\Http\Controllers\AccountingReportController::class, 'receivables'])->middleware('permission:accounting.read,sanctum');
    Route::get('/accounting/payables', [App\Modules\Accounting\Http\Controllers\AccountingReportController::class, 'payables'])->middleware('permission:accounting.read,sanctum');
    Route::get('/accounting/ledger', [App\Modules\Accounting\Http\Controllers\AccountingReportController::class, 'ledger'])->middleware('permission:accounting.read,sanctum');

    // Accounting - Financial Statements
    Route::get('/accounting/profit-and-loss', [App\Modules\Accounting\Http\Controllers\FinancialStatementController::class, 'profitAndLoss'])->middleware('permission:accounting.read,sanctum');
    Route::get('/accounting/balance-sheet', [App\Modules\Accounting\Http\Controllers\FinancialStatementController::class, 'balanceSheet'])->middleware('permission:accounting.read,sanctum');
    Route::get('/accounting/vat-return', [App\Modules\Accounting\Http\Controllers\FinancialStatementController::class, 'vatReturn'])->middleware('permission:accounting.read,sanctum');

    // Accounting - Bank Accounts
    Route::get('/accounting/bank-accounts', [App\Modules\Accounting\Http\Controllers\BankAccountController::class, 'index'])->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/bank-accounts', [App\Modules\Accounting\Http\Controllers\BankAccountController::class, 'store'])->middleware('permission:accounting.create,sanctum');
    Route::get('/accounting/bank-accounts/{id}', [App\Modules\Accounting\Http\Controllers\BankAccountController::class, 'show'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');
    Route::put('/accounting/bank-accounts/{id}', [App\Modules\Accounting\Http\Controllers\BankAccountController::class, 'update'])->whereNumber('id')->middleware('permission:accounting.update,sanctum');

    // Accounting - Cheques (received/issued tracking, clear/bounce lifecycle)
    Route::get('/accounting/cheques', [App\Modules\Accounting\Http\Controllers\ChequeController::class, 'index'])->middleware('permission:accounting.read,sanctum');
    Route::get('/accounting/cheques/{id}', [App\Modules\Accounting\Http\Controllers\ChequeController::class, 'show'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/cheques/{id}/clear', [App\Modules\Accounting\Http\Controllers\ChequeController::class, 'clear'])->whereNumber('id')->middleware('permission:accounting.approve,sanctum');
    Route::post('/accounting/cheques/{id}/bounce', [App\Modules\Accounting\Http\Controllers\ChequeController::class, 'bounce'])->whereNumber('id')->middleware('permission:accounting.approve,sanctum');
    Route::post('/accounting/cheques/{id}/cancel', [App\Modules\Accounting\Http\Controllers\ChequeController::class, 'cancel'])->whereNumber('id')->middleware('permission:accounting.approve,sanctum');

    // Accounting - Bank Reconciliation
    Route::get('/accounting/bank-reconciliations', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'index'])->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/bank-reconciliations', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'store'])->middleware('permission:accounting.create,sanctum');
    Route::get('/accounting/bank-reconciliations/{id}', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'show'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/bank-reconciliations/{id}/import', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'importCsv'])->whereNumber('id')->middleware('permission:accounting.create,sanctum');
    Route::get('/accounting/bank-reconciliations/{id}/candidate-journal-lines', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'candidateJournalLines'])->whereNumber('id')->middleware('permission:accounting.read,sanctum');
    Route::post('/accounting/bank-reconciliations/{id}/auto-match', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'autoMatch'])->whereNumber('id')->middleware('permission:accounting.create,sanctum');
    Route::post('/accounting/bank-reconciliations/{id}/match', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'match'])->whereNumber('id')->middleware('permission:accounting.create,sanctum');
    Route::post('/accounting/bank-reconciliations/{id}/lines/{lineId}/unmatch', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'unmatch'])->whereNumber('id')->whereNumber('lineId')->middleware('permission:accounting.create,sanctum');
    Route::post('/accounting/bank-reconciliations/{id}/lock', [App\Modules\Accounting\Http\Controllers\BankReconciliationController::class, 'lock'])->whereNumber('id')->middleware('permission:accounting.approve,sanctum');

    // Reporting - Sales, Inventory, Branch Performance (role scoping is enforced
    // inside the controller — reporting.read alone is too coarse-grained to match
    // reporting/business-rules.md's per-role Access Control table).
    Route::get('/reporting/sales/daily', [App\Modules\Reporting\Http\Controllers\ReportingController::class, 'salesDaily'])->middleware('permission:reporting.read,sanctum');
    Route::get('/reporting/sales/by-part', [App\Modules\Reporting\Http\Controllers\ReportingController::class, 'salesByPart'])->middleware('permission:reporting.read,sanctum');
    Route::get('/reporting/inventory/stock-balance', [App\Modules\Reporting\Http\Controllers\ReportingController::class, 'stockBalance'])->middleware('permission:reporting.read,sanctum');
    Route::get('/reporting/inventory/stock-ageing', [App\Modules\Reporting\Http\Controllers\ReportingController::class, 'stockAgeing'])->middleware('permission:reporting.read,sanctum');
    Route::get('/reporting/branches/performance', [App\Modules\Reporting\Http\Controllers\ReportingController::class, 'branchPerformance'])->middleware('permission:reporting.read,sanctum');

    // Notifications - In-System (recipient scoping happens at creation time,
    // not at read time — every row already belongs to one user_id).
    Route::get('/notifications', [App\Modules\Notifications\Http\Controllers\NotificationController::class, 'index'])->middleware('permission:notifications.read,sanctum');
    Route::patch('/notifications/{id}/read', [App\Modules\Notifications\Http\Controllers\NotificationController::class, 'markRead'])->whereNumber('id')->middleware('permission:notifications.read,sanctum');
    Route::patch('/notifications/read-all', [App\Modules\Notifications\Http\Controllers\NotificationController::class, 'markAllRead'])->middleware('permission:notifications.read,sanctum');

    // Sales - Customer Payments (reduces AR)
    Route::get('/sales/payments', [App\Modules\Sales\Http\Controllers\InvoicePaymentController::class, 'index'])->middleware('permission:sales.read,sanctum');
    Route::post('/sales/payments', [App\Modules\Sales\Http\Controllers\InvoicePaymentController::class, 'store'])->middleware('permission:sales.create,sanctum');

    // Purchasing - Supplier Payments (reduces AP)
    Route::get('/purchasing/payments', [App\Modules\Purchasing\Http\Controllers\PurchasePaymentController::class, 'index'])->middleware('permission:purchasing.read,sanctum');
    Route::post('/purchasing/payments', [App\Modules\Purchasing\Http\Controllers\PurchasePaymentController::class, 'store'])->middleware('permission:purchasing.create,sanctum');

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
    Route::get('/sales/customers/{id}/credit-limits', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'creditLimits'])->whereNumber('id')->middleware('permission:crm.read,sanctum');
    Route::post('/sales/customers/{id}/credit-limits', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'setCreditLimit'])->whereNumber('id')->middleware('permission:crm.manage_credit_limit,sanctum');
    Route::get('/sales/customers/{id}/notes', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'notes'])->whereNumber('id')->middleware('permission:crm.read,sanctum');
    Route::post('/sales/customers/{id}/notes', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'addNote'])->whereNumber('id')->middleware('permission:crm.create,sanctum');
    Route::get('/sales/customers/{id}/statement', [App\Modules\Sales\Http\Controllers\CustomerController::class, 'statement'])->whereNumber('id')->middleware('permission:crm.read,sanctum');

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

    // Profile - self-service, read-only view of the current user's own data.
    // No hr.read needed: viewing your own record isn't "managing HR".
    Route::get('/profile', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'me']);

    // HR - Employees
    Route::get('/hr/employees', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'index'])->middleware('permission:hr.read,sanctum');
    Route::post('/hr/employees', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'store'])->middleware('permission:hr.create,sanctum');
    Route::get('/hr/employees/{id}', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'show'])->whereNumber('id')->middleware('permission:hr.read,sanctum');
    Route::put('/hr/employees/{id}', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'update'])->whereNumber('id')->middleware('permission:hr.update,sanctum');

    // HR - Expense claims. Submission is self-service (any authenticated
    // employee files their own claim) — not gated by an hr.* permission,
    // which governs managing OTHER people's HR records.
    Route::post('/hr/expenses', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'storeExpenseClaim']);
    Route::post('/hr/expenses/{id}/approve', [App\Modules\Hr\Http\Controllers\EmployeeController::class, 'approveExpense'])->whereNumber('id')->middleware('permission:hr.approve,sanctum');

    // HR - Payroll (erp-context/decisions/ADR-006)
    Route::get('/hr/employees/{id}/salary-components', [App\Modules\Hr\Http\Controllers\SalaryComponentController::class, 'index'])->whereNumber('id')->middleware('permission:hr.read,sanctum');
    Route::post('/hr/employees/{id}/salary-components', [App\Modules\Hr\Http\Controllers\SalaryComponentController::class, 'store'])->whereNumber('id')->middleware('permission:hr.update,sanctum');
    Route::put('/hr/salary-components/{id}', [App\Modules\Hr\Http\Controllers\SalaryComponentController::class, 'update'])->whereNumber('id')->middleware('permission:hr.update,sanctum');
    Route::delete('/hr/salary-components/{id}', [App\Modules\Hr\Http\Controllers\SalaryComponentController::class, 'destroy'])->whereNumber('id')->middleware('permission:hr.update,sanctum');

    Route::get('/hr/payroll/pay-runs', [App\Modules\Hr\Http\Controllers\PayRunController::class, 'index'])->middleware('permission:hr.read,sanctum');
    Route::post('/hr/payroll/pay-runs', [App\Modules\Hr\Http\Controllers\PayRunController::class, 'store'])->middleware('permission:hr.create,sanctum');
    Route::get('/hr/payroll/pay-runs/{id}', [App\Modules\Hr\Http\Controllers\PayRunController::class, 'show'])->whereNumber('id')->middleware('permission:hr.read,sanctum');
    Route::post('/hr/payroll/pay-runs/{id}/approve', [App\Modules\Hr\Http\Controllers\PayRunController::class, 'approve'])->whereNumber('id')->middleware('permission:hr.approve,sanctum');
    Route::post('/hr/payroll/pay-runs/{id}/pay', [App\Modules\Hr\Http\Controllers\PayRunController::class, 'pay'])->whereNumber('id')->middleware('permission:hr.approve,sanctum');

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
