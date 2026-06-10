import Swal from "sweetalert2";

const brandColor = "#465fff";

export async function confirmAction(options: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "question" | "info";
}) {
  return Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? "question",
    showCancelButton: true,
    confirmButtonColor: brandColor,
    cancelButtonColor: "#667085",
    confirmButtonText: options.confirmText ?? "Confirmer",
    cancelButtonText: options.cancelText ?? "Annuler",
    reverseButtons: true,
    focusCancel: true,
  });
}

export function showSuccess(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "success",
    confirmButtonColor: brandColor,
    confirmButtonText: "OK",
  });
}

export function showWarning(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    confirmButtonColor: brandColor,
    confirmButtonText: "OK",
  });
}

export function showError(title: string, text?: string) {
  return Swal.fire({
    title,
    text,
    icon: "error",
    confirmButtonColor: brandColor,
    confirmButtonText: "Fermer",
  });
}
