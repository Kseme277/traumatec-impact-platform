import Swal from "sweetalert2";

const brandColor = "#465fff";

export async function confirmAction(options: {
  title: string;
  text?: string;
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

export async function promptComment(options: {
  title: string;
  text?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}) {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    input: "textarea",
    inputPlaceholder: options.placeholder ?? "",
    inputAttributes: { "aria-label": options.placeholder ?? "" },
    showCancelButton: true,
    confirmButtonColor: brandColor,
    cancelButtonColor: "#667085",
    confirmButtonText: options.confirmText ?? "Confirmer",
    cancelButtonText: options.cancelText ?? "Annuler",
    reverseButtons: true,
    focusCancel: true,
    preConfirm: (value) => {
      const trimmed = String(value ?? "").trim();
      if (options.required !== false && !trimmed) {
        Swal.showValidationMessage(options.placeholder ?? "Required");
        return false;
      }
      return trimmed;
    },
  });
  return {
    isConfirmed: result.isConfirmed,
    value: result.isConfirmed ? String(result.value ?? "").trim() : "",
  };
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
