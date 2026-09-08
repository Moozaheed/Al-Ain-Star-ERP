<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @font-face {
        font-family: 'NotoArabic';
        src: url('{{ resource_path('fonts/NotoNaskhArabic-Regular.ttf') }}') format('truetype');
        font-weight: normal;
    }
    @font-face {
        font-family: 'NotoArabic';
        src: url('{{ resource_path('fonts/NotoNaskhArabic-Bold.ttf') }}') format('truetype');
        font-weight: bold;
    }

    * { box-sizing: border-box; }
    body {
        font-family: 'DejaVu Sans', sans-serif;
        font-size: 10px;
        color: #1a1a1a;
        margin: 0;
    }
    .ar {
        font-family: 'NotoArabic', 'DejaVu Sans', sans-serif;
        direction: rtl;
        unicode-bidi: embed;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { padding: 0; vertical-align: top; }

    /* Header */
    .header-table td { padding: 2px 0; }
    .company-en { font-size: 20px; font-weight: bold; color: #c0272d; letter-spacing: 1px; }
    .company-en-sub { font-size: 8px; color: #333; }
    .company-ar { font-size: 15px; font-weight: bold; color: #c0272d; }
    .company-ar-sub { font-size: 9px; color: #333; }
    .logo-cell { text-align: right; width: 170px; }
    .logo-cell img { width: 160px; }
    .contact-line { text-align: center; font-size: 8.5px; color: #333; padding: 4px 0; border-top: 2px solid #c0272d; border-bottom: 1px solid #999; margin-top: 4px; }

    /* Title bar */
    .title-bar { background: #f0f0f0; border: 1px solid #999; padding: 4px 8px; font-size: 11px; font-weight: bold; }
    .title-bar .right { float: right; }

    /* Meta section */
    .meta-table { border: 1px solid #999; border-top: none; }
    .meta-table td { border-right: 1px solid #ccc; padding: 6px 8px; font-size: 9px; }
    .meta-table td:last-child { border-right: none; }
    .meta-label { color: #555; }
    .meta-value { font-weight: bold; }
    .customer-name { font-size: 11px; font-weight: bold; margin-bottom: 3px; }

    /* Items table */
    .items-table { border: 1px solid #999; border-top: none; margin-top: -1px; }
    .items-table th {
        background: #2b2b2b; color: #fff; font-size: 8px; text-align: center;
        padding: 5px 4px; border-right: 1px solid #555;
    }
    .items-table th:last-child { border-right: none; }
    .items-table td {
        font-size: 9px; padding: 5px 4px; border-right: 1px solid #ddd; border-bottom: 1px solid #eee;
    }
    .items-table td:last-child { border-right: none; }
    .items-table .num { text-align: right; }
    .items-table .center { text-align: center; }
    .items-table .fill-row td { border-bottom: none; height: 14px; }

    /* Totals */
    .totals-wrap { border: 1px solid #999; border-top: none; }
    .words-cell { width: 62%; padding: 8px; font-size: 9px; border-right: 1px solid #999; }
    .totals-cell { width: 38%; }
    .totals-cell table td { padding: 4px 8px; font-size: 9px; border-bottom: 1px solid #eee; }
    .totals-cell .label { color: #333; }
    .totals-cell .value { text-align: right; font-weight: bold; }
    .totals-cell .grand td { background: #f0f0f0; font-weight: bold; font-size: 10.5px; border-bottom: none; }

    .footer-row { margin-top: 24px; }
    .footer-row td { font-size: 9px; padding-top: 30px; }
    .stamp-label { font-weight: bold; }

    .status-badge { display: inline-block; padding: 2px 8px; border: 1px solid #999; font-size: 8px; border-radius: 3px; }
</style>
</head>
<body>

<table class="header-table">
    <tr>
        <td style="width: 55%;">
            <div class="company-en">{{ $company['name_en'] }}</div>
            <div class="company-en-sub">{{ $company['tagline_en'] }}</div>
        </td>
        <td class="logo-cell" rowspan="2">
            <img src="file://{{ $company['logo_path'] }}" />
        </td>
    </tr>
    <tr>
        <td>
            <div class="company-ar ar">{{ $company['name_ar'] }}</div>
            <div class="company-ar-sub ar">{{ $company['tagline_ar'] }}</div>
        </td>
    </tr>
</table>

<div class="contact-line">
    Tel: {{ $company['phone'] }} &nbsp;|&nbsp; {{ $company['address_en'] }} &nbsp;|&nbsp;
    <span class="ar">{{ $company['address_ar'] }}</span> &nbsp;|&nbsp; TRN: {{ $company['trn'] }}
</div>

<table class="title-bar" style="margin-top: 6px;">
    <tr>
        <td>Bill To <span class="ar">فاتورة إلى</span></td>
        <td class="right">TAX INVOICE <span class="ar">فاتورة ضريبية</span> &nbsp;&nbsp; Page 1</td>
    </tr>
</table>

<table class="meta-table">
    <tr>
        <td style="width: 55%;">
            <div class="customer-name">{{ $invoice->customer_name ?? $invoice->customer?->name ?? 'CASH CUSTOMER' }}</div>
            @if($invoice->customer?->address)
                <div>{{ $invoice->customer->address }}</div>
            @endif
            <div><span class="meta-label ar">رقم التليفون Tel No:</span> {{ $invoice->customer?->phone ?? '-' }}</div>
            <div><span class="meta-label ar">رقم التسجيل الضريبي TRN:</span> {{ $invoice->customer?->trn ?? '-' }}</div>
        </td>
        <td style="width: 45%;">
            <table>
                <tr>
                    <td class="meta-label" style="width: 55%;">Invoice No <span class="ar">رقم الفاتورة</span></td>
                    <td class="meta-value">: {{ $invoice->invoice_number }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Date <span class="ar">التاريخ</span></td>
                    <td class="meta-value">: {{ $invoice->invoice_date->format('d/m/Y') }}</td>
                </tr>
                <tr>
                    <td class="meta-label">LPO No <span class="ar">رقم طلب الشراء</span></td>
                    <td class="meta-value">: {{ $invoice->lpo_number ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Ref No <span class="ar">رقم المرجع</span></td>
                    <td class="meta-value">: {{ $invoice->ref_number ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="meta-label">Payment <span class="ar">طريقة الدفع</span></td>
                    <td class="meta-value">: {{ ucwords(str_replace('_', ' ', $invoice->payment_mode)) }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table class="items-table">
    <thead>
    <tr>
        <th style="width: 4%;">SNO<br><span class="ar">رقم</span></th>
        <th style="width: 26%;">PART NAME<br><span class="ar">التفاصيل</span></th>
        <th style="width: 7%;">QTY<br><span class="ar">الكمية</span></th>
        <th style="width: 10%;">RATE<br><span class="ar">سعر الوحدة</span></th>
        <th style="width: 12%;">AMOUNT<br><span class="ar">المجموع</span></th>
        <th style="width: 8%;">VAT %<br><span class="ar">الضريبة %</span></th>
        <th style="width: 10%;">VAT<br><span class="ar">الضريبة</span></th>
        <th style="width: 13%;">NET AMT<br><span class="ar">المجموع شامل الضريبة</span></th>
    </tr>
    </thead>
    <tbody>
    @foreach($invoice->items as $i => $item)
        <tr>
            <td class="center">{{ $i + 1 }}</td>
            <td>{{ $item->part?->part_number }} — {{ $item->description ?? $item->part?->description }}</td>
            <td class="num">{{ $item->qty }}</td>
            <td class="num">{{ number_format((float) $item->unit_price, 2) }}</td>
            <td class="num">{{ number_format((float) $item->line_subtotal, 2) }}</td>
            <td class="num">{{ number_format((float) $item->vat_rate, 0) }}%</td>
            <td class="num">{{ number_format((float) $item->line_vat, 2) }}</td>
            <td class="num">{{ number_format((float) $item->line_total, 2) }}</td>
        </tr>
    @endforeach
    @for($i = 0; $i < max(0, 3 - count($invoice->items)); $i++)
        <tr class="fill-row"><td colspan="8">&nbsp;</td></tr>
    @endfor
    </tbody>
</table>

<table class="totals-wrap">
    <tr>
        <td class="words-cell">
            <div><b>{{ $amountInWords }}</b></div>
            @if($invoice->notes)
                <div style="margin-top: 6px;"><b>Remark:</b> {{ $invoice->notes }}</div>
            @endif
        </td>
        <td class="totals-cell">
            <table>
                <tr>
                    <td class="label">Total Before VAT <span class="ar">المجموع قبل الضريبة</span></td>
                    <td class="value">{{ number_format((float) $invoice->subtotal, 2) }}</td>
                </tr>
                @if((float) $invoice->discount_amount > 0)
                <tr>
                    <td class="label">Discount</td>
                    <td class="value">-{{ number_format((float) $invoice->discount_amount, 2) }}</td>
                </tr>
                @endif
                <tr>
                    <td class="label">VAT <span class="ar">الضريبة</span></td>
                    <td class="value">{{ number_format((float) $invoice->vat_amount, 2) }}</td>
                </tr>
                <tr class="grand">
                    <td class="label">Total Inc VAT (AED) <span class="ar">المجموع شامل الضريبة</span></td>
                    <td class="value">{{ number_format((float) $invoice->total, 2) }}</td>
                </tr>
                @if((float) $invoice->amount_due > 0)
                <tr>
                    <td class="label" style="color:#c0272d;">Amount Due</td>
                    <td class="value" style="color:#c0272d;">{{ number_format((float) $invoice->amount_due, 2) }}</td>
                </tr>
                @endif
            </table>
        </td>
    </tr>
</table>

<table class="footer-row">
    <tr>
        <td style="width: 50%;">
            <div class="stamp-label">Customer Signature</div>
        </td>
        <td style="width: 50%; text-align: right;">
            <div>For {{ $company['name_en'] }}......................</div>
        </td>
    </tr>
</table>

</body>
</html>
