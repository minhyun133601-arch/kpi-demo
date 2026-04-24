function formatEquipmentInputDisplay(value, options = {}) {
  const { fixedDigits = false } = options;
  const normalizedValue = normalizeEntryValue(value);
  if (!normalizedValue) {
    return "";
  }

  const sanitizedValue = sanitizeEquipmentInputValue(normalizedValue, {
    maxFractionDigits: EQUIPMENT_INPUT_FRACTION_DIGITS,
    preserveTrailingDecimalPoint: !fixedDigits,
  });
  if (!sanitizedValue) {
    return "";
  }

  if (fixedDigits) {
    const numericValue = Number.parseFloat(sanitizedValue);
    if (!Number.isFinite(numericValue)) {
      return "";
    }

    const safeValue = Object.is(numericValue, -0) ? 0 : numericValue;
    return new Intl.NumberFormat("ko-KR", {
      minimumFractionDigits: EQUIPMENT_INPUT_FRACTION_DIGITS,
      maximumFractionDigits: EQUIPMENT_INPUT_FRACTION_DIGITS,
    }).format(safeValue);
  }

  const hasTrailingDecimalPoint = sanitizedValue.endsWith(".");
  const [integerPartRaw = "", decimalPart = ""] = sanitizedValue.split(".");
  const formattedIntegerPart = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(Number(integerPartRaw || 0));

  if (hasTrailingDecimalPoint) {
    return `${formattedIntegerPart}.`;
  }

  if (decimalPart) {
    return `${formattedIntegerPart}.${decimalPart}`;
  }

  return formattedIntegerPart;
}

function formatEquipmentInputDisplayByDecimalDigits(value, decimalDigits) {
  const formattedValue = formatEquipmentInputDisplay(value);
  const normalizedDigits = normalizeEquipmentDecimalDigits(decimalDigits, null);
  if (!formattedValue || normalizedDigits === null) {
    return formattedValue;
  }

  const currentDigits = getEntryFractionDigits(formattedValue);
  if (normalizedDigits <= currentDigits) {
    return formattedValue;
  }

  const numericValue = Number.parseFloat(normalizeEntryValue(formattedValue));
  if (!Number.isFinite(numericValue)) {
    return formattedValue;
  }

  const safeValue = Object.is(numericValue, -0) ? 0 : numericValue;
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: normalizedDigits,
    maximumFractionDigits: normalizedDigits,
  }).format(safeValue);
}

function sanitizeEquipmentInputValue(value, options = {}) {
  const {
    maxFractionDigits = EQUIPMENT_INPUT_FRACTION_DIGITS,
    preserveTrailingDecimalPoint = true,
  } = options;
  const rawValue = String(value || "").replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!rawValue) {
    return "";
  }

  const [integerPart = "", ...decimalParts] = rawValue.split(".");
  if (!decimalParts.length) {
    return integerPart;
  }

  const decimalPart = decimalParts.join("").slice(0, Math.max(0, maxFractionDigits));
  if (!decimalPart) {
    return preserveTrailingDecimalPoint && rawValue.endsWith(".") ? `${integerPart}.` : integerPart;
  }

  return `${integerPart}.${decimalPart}`;
}

function createEquipmentItemId() {
  return `field_custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
