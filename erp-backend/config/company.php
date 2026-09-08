<?php

declare(strict_types=1);

// Static business-profile data printed on PDF documents (invoices, quotations).
// There is no settings table for this yet — see ADR-009 — so it lives here as
// a config file, sourced verbatim from the company's own printed letterhead
// (old_system_data/DY.pdf) rather than invented.

return [
    'name_en' => 'AL AIN STAR',
    'tagline_en' => 'AUTO SPARE PARTS - SOLE PROPRIETORSHIP L.L.C. BR 3',
    'name_ar' => 'نجم العين لقطع غيار السيارات ذ.م.م',
    'tagline_ar' => 'الشخص الواحد ذ.م.م فرع 3',
    'address_en' => 'Sanaiya, Al Ain - United Arab Emirates',
    'address_ar' => 'الصناعية، العين - الإمارات العربية المتحدة',
    'phone' => '03-766 1816, 03-764 0124',
    'trn' => '100035505500003',
    'logo_path' => resource_path('images/company-logo.png'),
];
