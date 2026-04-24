function findAdjacentEquipmentReadingDetailInTimeline(timeline, dateString, direction = -1) {
  const orderedDates = Array.isArray(timeline?.orderedDates) ? timeline.orderedDates : [];
  const detailsByDate = timeline?.detailsByDate;
  if (!orderedDates.length || !(detailsByDate instanceof Map)) {
    return null;
  }

  if (direction < 0) {
    for (let index = orderedDates.length - 1; index >= 0; index -= 1) {
      const candidateDate = orderedDates[index];
      if (candidateDate >= dateString) {
        continue;
      }

      const detail = detailsByDate.get(candidateDate);
      if (detail) {
        return {
          dateString: candidateDate,
          rawValue: detail.rawValue,
          value: detail.value,
          fractionDigits: detail.fractionDigits,
        };
      }
    }

    return null;
  }

  for (let index = 0; index < orderedDates.length; index += 1) {
    const candidateDate = orderedDates[index];
    if (candidateDate <= dateString) {
      continue;
    }

    const detail = detailsByDate.get(candidateDate);
    if (detail) {
      return {
        dateString: candidateDate,
        rawValue: detail.rawValue,
        value: detail.value,
        fractionDigits: detail.fractionDigits,
      };
    }
  }

  return null;
}

function getAdjacentRecordedEquipmentReading(equipmentId, dateString, direction = -1) {
  const detail = findAdjacentEquipmentReadingDetailInTimeline(
    getEquipmentReadingTimeline(equipmentId),
    dateString,
    direction
  );
  if (!detail) {
    return null;
  }

  return {
    dateString: detail.dateString,
    value: detail.value,
  };
}

function getAdjacentStoredEquipmentReadingDetail(equipmentId, dateString, direction = -1) {
  return findAdjacentEquipmentReadingDetailInTimeline(
    getEquipmentReadingTimeline(equipmentId),
    dateString,
    direction
  );
}

function getAdjacentRecordedEquipmentReadingDetail(equipmentId, dateString, direction = -1) {
  return findAdjacentEquipmentReadingDetailInTimeline(
    getEquipmentReadingTimeline(equipmentId),
    dateString,
    direction
  );
}

function getAdjacentValidationRecordedEquipmentReading(equipmentId, dateString, direction = -1) {
  return findAdjacentEquipmentReadingDetailInTimeline(
    getValidationReadingTimeline(equipmentId),
    dateString,
    direction
  );
}

function getGasRecentUsageWindow(equipmentId, dateString) {
  const currentReading = getEquipmentReadingDetailOnDate(equipmentId, dateString);
  if (!currentReading) {
    return null;
  }

  const previousReading = findAdjacentEquipmentReadingDetailInTimeline(
    getEquipmentReadingTimeline(equipmentId),
    dateString,
    -1
  );
  if (!previousReading) {
    return null;
  }

  return {
    startDate: previousReading.dateString,
    endDate: dateString,
    startReading: previousReading.value,
    endReading: currentReading.value,
    distributedDates: [dateString],
  };
}
