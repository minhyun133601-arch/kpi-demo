function formatMonthTitle(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return `${year}년 ${String(month).padStart(2, "0")}월`;
}

function normalizeMonthValue(value) {
  const normalizedValue = normalizeText(value);
  return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
}

function formatBillingDocumentMonthLabel(monthValue) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return "";
  }

  const [year, month] = normalizedMonth.split("-");
  return `${year.slice(-2)}.${month}`;
}

function formatFullDate(dateString) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(parseDateString(dateString));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(parseDateString(dateString));
}

function formatUpdatedAt(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatFixedDecimalNumber(value, fractionDigits = 3) {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value || 0));
}

function roundCalculatedUsage(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const roundedValue = Math.round(Number(value) + Number.EPSILON);
  return Object.is(roundedValue, -0) ? 0 : roundedValue;
}

function formatWholeNumber(value) {
  const safeValue = roundCalculatedUsage(Number(value || 0));
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function formatUsageShare(value) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value * 100)}%`;
}

function parseDateString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getNextDateString(dateString) {
  const nextDate = parseDateString(dateString);
  nextDate.setDate(nextDate.getDate() + 1);
  return formatDate(nextDate);
}

function isFutureDate(dateString) {
  return parseDateString(dateString) > today();
}

function today() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function looksLikeBrokenKoreanText(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue || /[가-힣]/.test(normalizedValue)) {
    return false;
  }

  return /[?\uFFFD]/.test(normalizedValue) || /[\u3400-\u9FFF\uF900-\uFAFF]/.test(normalizedValue);
}

function normalizeEntryValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.replace(/,/g, "").trim();
  }

  return "";
}

function getEntryFractionDigits(value) {
  const normalizedValue = normalizeEntryValue(value);
  if (!normalizedValue.includes(".")) {
    return 0;
  }

  return normalizedValue.split(".")[1]?.length || 0;
}
