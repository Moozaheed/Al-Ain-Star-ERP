import {
  PackageX, AlertCircle, CalendarClock, FileWarning, CheckCircle, DollarSign, ClipboardCheck, Bell,
} from "lucide-react";

export const NOTIFICATION_TYPE_ICON: Record<string, React.ElementType> = {
  LOW_STOCK_ALERT: PackageX,
  INVOICE_OVERDUE: AlertCircle,
  CHEQUE_DUE_SOON: CalendarClock,
  CHEQUE_BOUNCED: AlertCircle,
  DOCUMENT_EXPIRING: FileWarning,
  TRANSFER_APPROVED: CheckCircle,
  TRANSFER_RECEIVED: CheckCircle,
  PAYMENT_RECEIVED: DollarSign,
  APPROVAL_REQUEST: ClipboardCheck,
  CREDIT_LIMIT_REACHED: AlertCircle,
};

export function notificationIcon(eventType: string): React.ElementType {
  return NOTIFICATION_TYPE_ICON[eventType] ?? Bell;
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-AE");
}
