function createCategoryIcon(iconKey, className = "category-icon") {
  const safeIconKey = ICON_SVGS[iconKey] ? iconKey : "equipment";
  const icon = document.createElement("span");
  icon.className = className;
  icon.dataset.iconKind = safeIconKey;
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = ICON_SVGS[safeIconKey];
  return icon;
}

function createIconLabel(labelText, iconKey, options = {}) {
  const {
    containerTag = "span",
    containerClass = "icon-label",
    textClass = "icon-label-text",
    iconClass = "category-icon",
    trailingIconKey = "",
    trailingIconClass = "category-icon equipment-resource-badge-icon",
  } = options;
  const wrapper = document.createElement(containerTag);
  wrapper.className = containerClass;

  const icon = createCategoryIcon(iconKey, iconClass);
  const text = document.createElement("span");
  text.className = textClass;
  if (trailingIconKey) {
    text.classList.add("has-trailing-icon");
    const copy = document.createElement("span");
    copy.className = "icon-label-copy-text";
    copy.textContent = labelText;
    text.append(copy, createCategoryIcon(trailingIconKey, trailingIconClass));
  } else {
    text.textContent = labelText;
  }

  wrapper.append(icon, text);
  return wrapper;
}
