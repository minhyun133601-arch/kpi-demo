function getEquipmentReadingOnDate(equipmentId, dateString) {
  return getEquipmentReadingDetailOnDate(equipmentId, dateString)?.value ?? null;
}

function getEquipmentReadingDates(equipmentId) {
  return [...getEquipmentReadingTimeline(equipmentId).orderedDates];
}

function getDistributedUsageDates(startDate, endDate) {
  const distributedDates = [];
  let cursor = startDate;

  while (cursor && cursor < endDate) {
    distributedDates.push(cursor);
    cursor = getNextDateString(cursor);
  }

  return distributedDates;
}

function getEquipmentDistributedUsageWindow(equipmentId, dateString) {
  const readingDates = getEquipmentReadingDates(equipmentId);
  if (readingDates.length < 2) {
    return null;
  }

  let startIndex = -1;
  for (let index = 0; index < readingDates.length; index += 1) {
    if (readingDates[index] <= dateString) {
      startIndex = index;
      continue;
    }

    break;
  }

  if (startIndex < 0 || startIndex >= readingDates.length - 1) {
    return null;
  }

  const startDate = readingDates[startIndex];
  const endDate = readingDates[startIndex + 1];
  if (dateString < startDate || dateString >= endDate) {
    return null;
  }

  const startReading = getEquipmentReadingOnDate(equipmentId, startDate);
  const endReading = getEquipmentReadingOnDate(equipmentId, endDate);
  if (startReading === null || endReading === null) {
    return null;
  }

  const distributedDates = getDistributedUsageDates(startDate, endDate);
  if (!distributedDates.includes(dateString)) {
    return {
      startDate,
      endDate,
      startReading,
      endReading,
      distributedDates: [],
    };
  }

  return {
    startDate,
    endDate,
    startReading,
    endReading,
    distributedDates,
  };
}
