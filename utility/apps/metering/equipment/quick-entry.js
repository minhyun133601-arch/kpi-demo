function processQuickEntryTextarea() {
  const rawLines = String(elements.quickEntryTextarea?.value || "").split(/\r?\n/);
  if (!rawLines.length) {
    return;
  }

  let processedCount = 0;
  let lastMatchedFieldKey = "";
  const remainingLines = [];

  rawLines.forEach((line) => {
    const draftValue = normalizeText(line);
    if (!draftValue) {
      return;
    }

    const result = applyQuickEntryValue(draftValue);
    pushQuickEntryResult(result.message, result.kind);

    if (!result.ok) {
      remainingLines.push(draftValue);
      return;
    }

    processedCount += 1;
    lastMatchedFieldKey = result.fieldKey;
  });

  if (elements.quickEntryTextarea) {
    elements.quickEntryTextarea.value = remainingLines.join("\n");
  }

  if (processedCount) {
    syncEquipmentRestIndicators();
    syncEquipmentReadingValidationStates();
    updateDirtyState();
    updateActionState();
    scheduleEquipmentLocalAutosave();
    syncQuickEntryCounter();

    if (lastMatchedFieldKey) {
      revealQuickEntryMatchedField(lastMatchedFieldKey);
    }
  }

  elements.quickEntryTextarea?.focus();
}

function applyQuickEntryValue(rawValue) {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    return {
      ok: false,
      kind: "error",
      message: "날짜를 먼저 선택해 주세요.",
      fieldKey: "",
    };
  }

  const normalizedValue = sanitizeEquipmentInputValue(rawValue, {
    maxFractionDigits: EQUIPMENT_INPUT_FRACTION_DIGITS,
    preserveTrailingDecimalPoint: false,
  });
  const numericValue = Number.parseFloat(normalizedValue);

  if (!normalizedValue || !Number.isFinite(numericValue)) {
    return {
      ok: false,
      kind: "error",
      message: `${rawValue} 값을 숫자로 읽지 못했습니다.`,
      fieldKey: "",
    };
  }

  const matchResult = findBestQuickEntryMatch(normalizedValue);
  if (!matchResult.match) {
    return {
      ok: false,
      kind: "error",
      message: matchResult.message,
      fieldKey: "",
    };
  }

  const { input, fieldKey, label } = matchResult.match;
  const formattedValue = formatEquipmentInputDisplayByDecimalDigits(
    normalizedValue,
    getEquipmentDecimalDigits(fieldKey)
  );
  input.value = formattedValue;
  input.dataset.lastValue = formattedValue;

  const validationMessage = getEquipmentValidationMessageForValue(fieldKey, normalizedValue);
  return {
    ok: true,
    kind: validationMessage ? "warning" : "success",
    message: validationMessage
      ? `${label} ${formattedValue} 기입, ${validationMessage}`
      : `${label} ${formattedValue} 기입`,
    fieldKey,
  };
}

function findBestQuickEntryMatch(rawValue) {
  const candidateInputs = getQuickEntryCandidateInputs();
  if (!candidateInputs.length) {
    return {
      match: null,
      message: "자동 기입할 빈 설비가 없습니다.",
    };
  }

  const candidates = candidateInputs
    .map((input, index) => {
      const fieldKey = input.dataset.fieldKey || "";
      const equipment = getEquipmentItem(fieldKey);
      const reference = getQuickEntryComparisonReference(fieldKey, state.selectedDate);
      const currentDetail = getValidationReadingDetailOnDate(fieldKey, state.selectedDate, {
        currentRawValue: rawValue,
        preferCurrentRawValue: true,
      });
      if (!fieldKey || !equipment || !reference || !currentDetail) {
        return null;
      }

      return {
        input,
        fieldKey,
        label: getEquipmentDisplayLabel(equipment),
        reference,
        distance: Math.abs(currentDetail.value - reference.value),
        fractionPenalty:
          reference.fractionDigits === currentDetail.fractionDigits
            ? 0
            : Math.abs(reference.fractionDigits - currentDetail.fractionDigits) + 1,
        sourceIndex: index,
      };
    })
    .filter(Boolean);

  if (!candidates.length) {
    return {
      match: null,
      message: "비교할 최근값이 있는 설비가 없습니다.",
    };
  }

  candidates.sort((left, right) => {
    if (left.fractionPenalty !== right.fractionPenalty) {
      return left.fractionPenalty - right.fractionPenalty;
    }

    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.sourceIndex - right.sourceIndex;
  });

  return {
    match: candidates[0],
    message: "",
  };
}

function getQuickEntryCandidateInputs() {
  return getTabNavigableEquipmentInputs().filter((input) => {
    const fieldKey = input.dataset.fieldKey || "";
    const equipment = getEquipmentItem(fieldKey);

    if (!equipment || isHiddenEquipmentFieldCard(equipment) || isAutoCalculatedEquipment(equipment)) {
      return false;
    }

    return normalizeEntryValue(input.value) === "";
  });
}

function getQuickEntryComparisonReference(fieldKey, dateString) {
  const previousReading = getAdjacentRecordedEquipmentReadingDetail(fieldKey, dateString, -1);
  if (previousReading) {
    return {
      ...previousReading,
      fractionDigits: getEquipmentDecimalDigits(fieldKey),
    };
  }

  const nextReading = getAdjacentRecordedEquipmentReadingDetail(fieldKey, dateString, 1);
  if (!nextReading) {
    return null;
  }

  return {
    ...nextReading,
    fractionDigits: getEquipmentDecimalDigits(fieldKey),
  };
}

function getEquipmentValidationMessageForValue(fieldKey, rawValue, dateString = state.selectedDate) {
  return (
    getEquipmentReadingValidationIssuesForDate(
      {
        values: {
          [fieldKey]: rawValue,
        },
        statuses: {},
        fieldDayStatuses: {},
      },
      dateString
    )[0]?.message || ""
  );
}

function revealQuickEntryMatchedField(fieldKey) {
  const card = getEquipmentFieldCard(fieldKey);
  if (!card) {
    return;
  }

  card.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
  card.classList.remove("is-quick-entry-highlight");
  void card.offsetWidth;
  card.classList.add("is-quick-entry-highlight");
  window.setTimeout(() => {
    card.classList.remove("is-quick-entry-highlight");
  }, QUICK_ENTRY_HIGHLIGHT_DURATION);
}
