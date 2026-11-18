export const reportReasons = [
  { value: "inaccurate_information", label: "Informasi tidak akurat" },
  { value: "registration_link_issue", label: "Tautan pendaftaran bermasalah" },
  { value: "suspicious_competition", label: "Lomba mencurigakan" },
  { value: "other", label: "Lainnya" },
];

export const reportStatuses = [
  { value: "pending", label: "Menunggu" },
  { value: "resolved", label: "Selesai" },
  { value: "dismissed", label: "Diabaikan" },
];

export function reportReasonLabel(reason) {
  return reportReasons.find((item) => item.value === reason)?.label || "Lainnya";
}
