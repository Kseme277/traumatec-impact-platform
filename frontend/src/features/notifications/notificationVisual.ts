import type { TipNotification } from "../../api/notifications";

export type NotificationVisual = {
  bgClass: string;
  dotClass: string;
  iconPath: string;
};

export function notificationVisual(type: TipNotification["type"]): NotificationVisual {
  if (type.includes("failed") || type.includes("rejected")) {
    return {
      bgClass: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
      dotClass: "bg-error-500",
      iconPath:
        "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z",
    };
  }
  if (type.includes("completed") || type.includes("approved")) {
    return {
      bgClass: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
      dotClass: "bg-success-500",
      iconPath:
        "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
    };
  }
  if (type.includes("workflow") || type.includes("assigned")) {
    return {
      bgClass: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      dotClass: "bg-brand-500",
      iconPath:
        "M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z",
    };
  }
  return {
    bgClass: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
    dotClass: "bg-warning-500",
    iconPath:
      "M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z",
  };
}
