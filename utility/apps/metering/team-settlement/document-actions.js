function getCurrentMonthBillingDocument() {
  const monthValue = normalizeMonthValue(state.currentMonth);
  const scopeKey = getCurrentBillingSettlementScope();
  return monthValue ? getBillingDocumentForMonth(monthValue, scopeKey) : null;
}

function handleTeamSettlementPreviewClick(event) {
  event?.preventDefault();

  const monthValue = normalizeMonthValue(state.currentMonth);
  const billingDocument = getCurrentMonthBillingDocument();
  if (!monthValue || !billingDocument) {
    window.alert("미리볼 청구서가 없습니다.");
    return;
  }

  const scopeKey = getCurrentBillingSettlementScope();
  openBillingDocumentPreview(monthValue, billingDocument, getCurrentResourceType(), scopeKey);
}

function handleTeamSettlementOpenClick(event) {
  event?.preventDefault();

  const monthValue = normalizeMonthValue(state.currentMonth);
  const billingDocument = getCurrentMonthBillingDocument();
  if (!monthValue || !billingDocument) {
    window.alert("다운할 청구서가 없습니다.");
    return;
  }

  downloadBillingDocument(monthValue, billingDocument, getCurrentResourceType());
}
