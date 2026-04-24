const PRESET_IMPORT_VERSION = 6;
const ENTRY_RESET_VERSION = 1;
const ENTRY_STATUS_BASELINE_VERSION = 3;
const EQUIPMENT_FACTOR_MIGRATION_VERSION = 2;
const TEAM_ASSIGNMENT_BASELINE_VERSION = 1;
const HISTORICAL_ENTRY_VALUE_FIX_VERSION = 4;
const STICK_METER_SPLIT_VERSION = 3;
const CLEARED_ENTRY_MONTH_PREFIXES = [];
const STICK_FIELD_ID = "field_13";
const STICK_FIELD_LABEL = "Process Beta";
const STICK_READING_WRAP_BASE = 10000;
const LEGACY_STICK_FIELD_IDS = [
  STICK_FIELD_ID,
  "field_stick_2024_04_to_2025_06",
  "field_stick_after_2025_08",
];
const EQUIPMENT_TITLE_DOUBLE_CLICK_DELAY_MS = 320;
const HISTORICAL_ENTRY_VALUE_FIXES = Object.freeze({});
const ENTRY_VALUE_CORRECTIONS = Object.freeze({});
const LOCAL_FILE_HANDLE_DB_NAME = "monthly-electric-local-file";
const LOCAL_FILE_HANDLE_STORE_NAME = "handles";
const LOCAL_BILLING_DOCUMENT_DIRECTORY_HANDLE_KEY = "billing-document-directory";
const ENABLE_SHARED_SERVER_WRITE = true;
const SHARED_APP_CONFIG = resolveSharedAppConfig();
const LEGACY_BILLING_DOCUMENT_DIRECTORY_NAME = "청구서";
const BILLING_DOCUMENT_DIRECTORY_NAMES = Object.freeze({
  electric: "전기 청구서",
  gas: "가스 청구서",
  production: "생산량 문서",
});
const BILLING_DOCUMENT_ACCEPT = ".pdf,application/pdf";
const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY = "gas_plantB";
const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY = "plantA_lng";
const GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY = "plantA_lpg";
const WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY = "waste_plantB";
const WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY = "waste_plantA";
const GAS_PLANT_A_LNG_TEAM_KEY = "gas_plantA_lng";
const GAS_PLANT_A_LPG_TEAM_KEY = "gas_plantA_lpg";
const WASTE_PLANT_B_TEAM_KEY = "waste_plantB";
const WASTE_PLANT_A_TEAM_KEY = "waste_plantA";
const ELECTRIC_BILLING_SETTLEMENT_FIELDS = [
  { key: "base_charge", label: "기본요금" },
  { key: "power_charge", label: "전력량요금" },
  { key: "climate_environment_charge", label: "기후환경요금" },
  { key: "fuel_adjustment_charge", label: "연료비조정액" },
  { key: "lagging_power_factor_charge", label: "지상역률료" },
  { key: "operation_fee", label: "조작수수료" },
  { key: "internet_discount", label: "인터넷할인" },
  { key: "electricity_charge_total", label: "전기요금계" },
  { key: "unit_price", label: "단가" },
  { key: "vat", label: "부가가치세" },
  { key: "electric_power_fund", label: "전력기금" },
  { key: "tv_reception_fee", label: "TV수신료" },
  { key: "rounding_adjustment", label: "원단위 절삭" },
  { key: "billing_amount", label: "청구금액" },
];
const GAS_BILLING_SETTLEMENT_FIELDS = [
  { key: "power_charge", label: "사용료" },
  { key: "operation_fee", label: "교체비" },
  { key: "vat", label: "부가세" },
  { key: "fuel_adjustment_charge", label: "가산세" },
  { key: "rounding_adjustment", label: "원절삭" },
  { key: "calorific_value", label: "열량 (MJ/Nm3)" },
  { key: "billed_quantity_mj", label: "청구량 (MJ)" },
  { key: "unit_price", label: "단가" },
  { key: "billing_amount", label: "청구금액" },
];
const GAS_LPG_BILLING_SETTLEMENT_FIELDS = [
  { key: "power_charge", label: "공급가액" },
  { key: "vat", label: "세액" },
  { key: "unit_price", label: "단가" },
  { key: "billing_amount", label: "총액" },
];
const WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_B = [
  { key: "water", label: "용수비" },
  { key: "share", label: "폐수 분담금" },
  { key: "sludge", label: "폐수오니 처리비용" },
  { key: "resin", label: "Sample Material 처리비용" },
  { key: "labor", label: "인건비" },
  { key: "unit_price", label: "단가" },
  { key: "billing_amount", label: "총비용" },
];
const WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_A = [
  { key: "water", label: "용수비" },
  { key: "share", label: "폐수 분담금" },
  { key: "sludge", label: "폐수오니 처리비용" },
  { key: "resin", label: "Sample Material 처리비용" },
  { key: "outsourcing", label: "위탁관리비" },
  { key: "unit_price", label: "단가" },
  { key: "billing_amount", label: "총비용" },
];
const WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_B = Object.freeze([
  { key: "water", sign: 1 },
  { key: "share", sign: 1 },
  { key: "sludge", sign: 1 },
  { key: "resin", sign: 1 },
  { key: "labor", sign: 1 },
]);
const WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_A = Object.freeze([
  { key: "water", sign: 1 },
  { key: "share", sign: 1 },
  { key: "sludge", sign: 1 },
  { key: "resin", sign: 1 },
  { key: "outsourcing", sign: 1 },
]);
const BILLING_SETTLEMENT_FIELDS = [
  ...new Map(
    [
      ...ELECTRIC_BILLING_SETTLEMENT_FIELDS,
      ...GAS_BILLING_SETTLEMENT_FIELDS,
      ...WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_B,
      ...WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_A,
    ]
      .map((field) => [field.key, field])
  ).values(),
];
const BILLING_SETTLEMENT_FIELD_KEYS = new Set(
  BILLING_SETTLEMENT_FIELDS.map((field) => field.key)
);
const ELECTRIC_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS = new Set([
  "electricity_charge_total",
  "unit_price",
  "billing_amount",
]);
const GAS_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS = new Set([
  "billed_quantity_mj",
  "unit_price",
  "billing_amount",
]);
const GAS_LPG_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS = new Set([
  "unit_price",
  "billing_amount",
]);
const WASTE_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS = new Set([
  "unit_price",
  "billing_amount",
]);
const BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS =
  ELECTRIC_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS;
const BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS = [
  "operation_fee",
  "internet_discount",
  "tv_reception_fee",
  "rounding_adjustment",
];
const GAS_BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS = [
  "fuel_adjustment_charge",
  "rounding_adjustment",
];
const ELECTRIC_BILLING_SETTLEMENT_TOTAL_COMPONENTS = [
  { key: "power_charge", sign: 1 },
  { key: "climate_environment_charge", sign: 1 },
  { key: "fuel_adjustment_charge", sign: 1 },
  { key: "operation_fee", sign: 1 },
  { key: "lagging_power_factor_charge", sign: 1 },
  { key: "internet_discount", sign: -1 },
];
const BILLING_SETTLEMENT_TOTAL_COMPONENTS = ELECTRIC_BILLING_SETTLEMENT_TOTAL_COMPONENTS;
const ELECTRIC_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS = [
  { key: "base_charge", sign: 1 },
  { key: "electricity_charge_total", sign: 1 },
  { key: "vat", sign: 1 },
  { key: "electric_power_fund", sign: 1 },
  { key: "tv_reception_fee", sign: 1 },
  { key: "rounding_adjustment", sign: -1 },
];
const GAS_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS = [
  { key: "power_charge", sign: 1 },
  { key: "operation_fee", sign: 1 },
  { key: "vat", sign: 1 },
  { key: "fuel_adjustment_charge", sign: 1 },
  { key: "rounding_adjustment", sign: -1 },
];
const GAS_LPG_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS = [
  { key: "power_charge", sign: 1 },
  { key: "vat", sign: 1 },
];
const BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS =
  ELECTRIC_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS;
const ELECTRIC_BILLING_SETTLEMENT_FORMULA_GUIDES = Object.freeze({
  electricity_charge_total:
    "전력량요금 + 기후환경요금 + 연료비조정액 + 조작수수료 + 지상역률료 - 인터넷할인",
  unit_price: "전기요금계 ÷ 해당 월 전력총량",
  billing_amount:
    "기본요금 + 전기요금계 + 부가가치세 + 전력기금 + TV수신료 - 원단위 절삭",
});
const GAS_BILLING_SETTLEMENT_FORMULA_GUIDES = Object.freeze({
  billed_quantity_mj: "해당 월 사용량 x 열량(MJ/Nm3)",
  unit_price: "사용료 ÷ 해당 월 사용량",
  billing_amount: "사용료 + 교체비 + 부가세 + 가산세 - 원절삭",
});
const GAS_LPG_BILLING_SETTLEMENT_FORMULA_GUIDES = Object.freeze({
  unit_price: "공급가액 ÷ LPG사용량",
  billing_amount: "공급가액 + 세액",
});
const WASTE_BILLING_SETTLEMENT_FORMULA_GUIDES = Object.freeze({
  unit_price: "총비용 ÷ 해당 월 사용량",
  billing_amount: "입력한 세부 비용 합계",
});
const BILLING_SETTLEMENT_FORMULA_GUIDES = ELECTRIC_BILLING_SETTLEMENT_FORMULA_GUIDES;
const BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE = Object.freeze({
  electric: Object.freeze([
    Object.freeze({ key: "plantA", label: "Plant A 정산", shortLabel: "Plant A" }),
    Object.freeze({ key: "plantB", label: "Plant B 정산", shortLabel: "Plant B" }),
  ]),
  gas: Object.freeze([
    Object.freeze({
      key: GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
      label: "Plant B 정산",
      shortLabel: "Plant B",
    }),
    Object.freeze({
      key: GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
      label: "Plant A LNG 정산",
      shortLabel: "Plant A LNG",
    }),
    Object.freeze({
      key: GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
      label: "Plant A LPG 정산",
      shortLabel: "Plant A LPG",
    }),
  ]),
  waste: Object.freeze([
    Object.freeze({
      key: WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
      label: "Plant B 정산",
      shortLabel: "Plant B",
    }),
    Object.freeze({
      key: WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY,
      label: "Plant A 정산",
      shortLabel: "Plant A",
    }),
  ]),
  production: Object.freeze([]),
});
const BILLING_SETTLEMENT_SCOPE_DEFINITIONS =
  BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE.electric;
const DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY = "plantA";
const BILLING_SETTLEMENT_SCOPE_KEYS = Object.freeze(
  [...new Set(
    Object.values(BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE)
      .flatMap((definitions) => definitions.map((item) => item.key))
  )]
);
const MODES = {
  EQUIPMENT: "equipment",
  TEAM: "team",
};

const RESOURCE_TYPES = {
  ELECTRIC: "electric",
  GAS: "gas",
  WASTE: "waste",
  PRODUCTION: "production",
};
const RESOURCE_DISPLAY_META = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: Object.freeze({
    billingDocumentDirectory: BILLING_DOCUMENT_DIRECTORY_NAMES.electric,
    eyebrow: "Monthly Electricity Entry Sheet",
    title: "월간 전기 기입 시트",
    teamEntrySectionTitle: "",
    teamSummaryLabel: "팀 전력",
    teamMonthTitleSuffix: "",
    equipmentListLabel: "설비 목록",
    equipmentEmptyTitle: "설비 없음",
    equipmentItemLabel: "설비",
  }),
  [RESOURCE_TYPES.GAS]: Object.freeze({
    billingDocumentDirectory: BILLING_DOCUMENT_DIRECTORY_NAMES.gas,
    eyebrow: "Monthly Gas Metering Sheet",
    title: "월간 가스 검침 시트",
    teamEntrySectionTitle: "",
    teamSummaryLabel: "팀 전력",
    teamMonthTitleSuffix: "",
    equipmentListLabel: "검침 항목",
    equipmentEmptyTitle: "설비 없음",
    equipmentItemLabel: "검침 항목",
  }),
  [RESOURCE_TYPES.WASTE]: Object.freeze({
    billingDocumentDirectory: "",
    eyebrow: "Monthly Wastewater Entry Sheet",
    title: "월간 폐수 기입 시트",
    teamEntrySectionTitle: "공장별 폐수",
    teamSummaryLabel: "공장별 폐수",
    teamMonthTitleSuffix: "폐수",
    equipmentListLabel: "폐수 입력",
    equipmentEmptyTitle: "폐수 입력 항목 없음",
    equipmentItemLabel: "폐수 입력",
  }),
  [RESOURCE_TYPES.PRODUCTION]: Object.freeze({
    billingDocumentDirectory: BILLING_DOCUMENT_DIRECTORY_NAMES.production,
    eyebrow: "Monthly Production Sheet",
    title: "월간 생산량 기입 시트",
    teamEntrySectionTitle: "팀별 생산량",
    teamSummaryLabel: "팀별 생산량",
    teamMonthTitleSuffix: "팀별 생산량",
    equipmentListLabel: "생산 항목",
    equipmentEmptyTitle: "생산 항목 없음",
    equipmentItemLabel: "생산 항목",
  }),
});
const RESOURCE_HERO_DESCRIPTIONS = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: [
    "월간 전력 사용량과 설비별 검침값을 한 화면에서 정리해 기록하고, 이상 변동을 빠르게 확인하는 운영 시트입니다.",
    "A monthly operating sheet for logging electricity readings, organizing equipment usage, and spotting unusual changes at a glance.",
  ].join("\n"),
  [RESOURCE_TYPES.GAS]: [
    "월간 가스 사용량과 검침 항목별 수치를 기준에 맞게 누적 관리하고, 변동 흐름을 한눈에 점검하는 검침 시트입니다.",
    "A monthly metering sheet for tracking gas readings, managing item-based usage records, and reviewing fluctuation trends with clarity.",
  ].join("\n"),
  [RESOURCE_TYPES.WASTE]: [
    "월별 폐수 사용량과 공장별 처리비용을 직접 입력하고, 기존 폐수 집계를 흔들지 않도록 필요한 달만 수기값으로 덮어쓰는 입력 시트입니다.",
    "A monthly wastewater input sheet for entering site usage and treatment costs while overriding only the months you update.",
  ].join("\n"),
  [RESOURCE_TYPES.PRODUCTION]: "",
});
const RESOURCE_TOGGLE_ORDER = Object.freeze([
  RESOURCE_TYPES.ELECTRIC,
  RESOURCE_TYPES.GAS,
  RESOURCE_TYPES.WASTE,
]);
const EQUIPMENT_INPUT_FRACTION_DIGITS = 2;
const FIXED_MIN_SELECTABLE_MONTH = "2024-01";
const FIXED_MAX_SELECTABLE_MONTH = "2026-12";
const TEAM_01_01_KEY = "team_01_01";
const PLANT_B_POWER_TEAM_KEY = "power_plantB";
const DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS = Object.freeze([TEAM_01_01_KEY]);
const DIRECT_TEAM_MONTHLY_AMOUNT_TEAM_KEYS = Object.freeze([TEAM_01_01_KEY]);
const DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS_BY_RESOURCE = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: Object.freeze([TEAM_01_01_KEY, PLANT_B_POWER_TEAM_KEY]),
  [RESOURCE_TYPES.GAS]: DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS,
  [RESOURCE_TYPES.WASTE]: Object.freeze([WASTE_PLANT_B_TEAM_KEY, WASTE_PLANT_A_TEAM_KEY]),
  [RESOURCE_TYPES.PRODUCTION]: Object.freeze([]),
});
const DIRECT_TEAM_MONTHLY_AMOUNT_TEAM_KEYS_BY_RESOURCE = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: Object.freeze([TEAM_01_01_KEY, PLANT_B_POWER_TEAM_KEY]),
  [RESOURCE_TYPES.GAS]: Object.freeze([]),
  [RESOURCE_TYPES.WASTE]: Object.freeze([]),
  [RESOURCE_TYPES.PRODUCTION]: Object.freeze([]),
});
const DIRECT_TEAM_MONTHLY_STORAGE_KEY_ALIASES_BY_RESOURCE = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: Object.freeze({
    [PLANT_B_POWER_TEAM_KEY]: TEAM_01_01_KEY,
  }),
  [RESOURCE_TYPES.GAS]: Object.freeze({}),
  [RESOURCE_TYPES.WASTE]: Object.freeze({}),
  [RESOURCE_TYPES.PRODUCTION]: Object.freeze({}),
});
const DIRECT_TEAM_MONTHLY_USAGE_KPI_TEAM_NAMES = Object.freeze({
  [RESOURCE_TYPES.ELECTRIC]: Object.freeze({
    [TEAM_01_01_KEY]: "Line Alpha",
  }),
  [RESOURCE_TYPES.GAS]: Object.freeze({
    [TEAM_01_01_KEY]: "Line Alpha (LNG)",
  }),
  [RESOURCE_TYPES.WASTE]: Object.freeze({
    [WASTE_PLANT_B_TEAM_KEY]: "Plant B",
    [WASTE_PLANT_A_TEAM_KEY]: "Plant A",
  }),
});

const GAS_METER_ITEM_DEFINITIONS = Object.freeze([
  { id: "gas_field_01", label: "LNG 합계", factor: 1 },
  { id: "gas_field_02", label: "Demo Heater (LPG)", factor: 1 },
  { id: "gas_field_03", label: "Demo Boiler A", factor: 1 },
  { id: "gas_field_04", label: "Demo Boiler B", factor: 1 },
  { id: "gas_field_05", label: "Admin Area", factor: 1 },
  { id: "gas_field_06", label: "Process Gamma Boiler", factor: 1 },
]);
const DEFAULT_WASTE_EQUIPMENT_ITEMS = Object.freeze([]);
const DEFAULT_PRODUCTION_EQUIPMENT_ITEMS = Object.freeze([]);

const TOTAL_POWER_TEAM_KEY = "power_total";
const LEGACY_ACTIVE_POWER_TEAM_KEY = "power_active";
const ELECTRIC_OTHER_COST_TEAM_KEY = "electric_other_cost";
const GAS_OTHER_COST_TEAM_KEY = "gas_other_cost";
const PLANT_B_TOTAL_SELECTION_ID = "plantB_total_direct_usage";
const ELECTRIC_OTHER_COST_SELECTION_IDS = Object.freeze({
  vat: "electric_other_cost_vat",
  electricPowerFund: "electric_other_cost_electric_power_fund",
  tvReceptionFee: "electric_other_cost_tv_reception_fee",
  roundingAdjustment: "electric_other_cost_rounding_adjustment",
  plantBVat: "electric_other_cost_plantB_vat",
  plantBElectricPowerFund: "electric_other_cost_plantB_electric_power_fund",
  plantBTvReceptionFee: "electric_other_cost_plantB_tv_reception_fee",
  plantBRoundingAdjustment: "electric_other_cost_plantB_rounding_adjustment",
  monthlyAdjustment: "electric_other_cost_monthly_adjustment",
});
const GAS_OTHER_COST_SELECTION_IDS = Object.freeze({
  plantBOperationFee: "gas_other_cost_plantB_operation_fee",
  plantBVat: "gas_other_cost_plantB_vat",
  plantBFuelAdjustmentCharge: "gas_other_cost_plantB_fuel_adjustment_charge",
  plantBRoundingAdjustment: "gas_other_cost_plantB_rounding_adjustment",
  plantALngOperationFee: "gas_other_cost_plantA_lng_operation_fee",
  plantALngVat: "gas_other_cost_plantA_lng_vat",
  plantALngFuelAdjustmentCharge: "gas_other_cost_plantA_lng_fuel_adjustment_charge",
  plantALngRoundingAdjustment: "gas_other_cost_plantA_lng_rounding_adjustment",
  plantALpgVat: "gas_other_cost_plantA_lpg_vat",
});

const TEAM_GROUPS = [
  { key: TEAM_01_01_KEY, label: "Line Alpha", iconKey: "drying" },
  { key: "team_01_02", label: "Line Beta", iconKey: "drying" },
  { key: "team_02", label: "Line Gamma", iconKey: "packaging" },
  { key: "team_03", label: "Line Delta", iconKey: "liquid" },
  { key: "team_04", label: "Admin Area", iconKey: "building" },
  { key: TOTAL_POWER_TEAM_KEY, label: "전력총량", iconKey: "power_active" },
  { key: PLANT_B_POWER_TEAM_KEY, label: "Plant B 전력 총량", iconKey: "power_active" },
  { key: "power_reactive", label: "무효전력", iconKey: "power_reactive" },
];
const ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS = Object.freeze([
  TEAM_01_01_KEY,
  "team_01_02",
  "team_02",
  "team_03",
  "team_04",
]);
const GAS_TEAM_GROUPS = Object.freeze([
  { key: TEAM_01_01_KEY, label: "Line Alpha", iconKey: "drying" },
  { key: GAS_PLANT_A_LNG_TEAM_KEY, label: "Line Beta LNG", iconKey: "drying" },
  { key: GAS_PLANT_A_LPG_TEAM_KEY, label: "Line Beta LPG", iconKey: "drying" },
  { key: "team_03", label: "Line Delta LNG", iconKey: "liquid" },
  { key: "team_04", label: "Admin Area", iconKey: "building" },
]);
const WASTE_TEAM_GROUPS = Object.freeze([
  { key: WASTE_PLANT_B_TEAM_KEY, label: "Plant B", iconKey: "building" },
  { key: WASTE_PLANT_A_TEAM_KEY, label: "Plant A", iconKey: "drying" },
]);
const GAS_OVERVIEW_TEAM_KEYS = Object.freeze(GAS_TEAM_GROUPS.map((team) => team.key));
const WASTE_OVERVIEW_TEAM_KEYS = Object.freeze(WASTE_TEAM_GROUPS.map((team) => team.key));
const ELECTRIC_TOTAL_SUMMARY_TEAM_KEYS = Object.freeze([
  PLANT_B_POWER_TEAM_KEY,
  TOTAL_POWER_TEAM_KEY,
  "power_reactive",
]);

const TEAM_AMOUNT_ADJUSTMENTS = Object.freeze({});

const SHARED_COMPRESSOR_SETTLEMENT_START_MONTH = "9999-12";
const SHARED_COMPRESSOR_VIRTUAL_ID = "shared_compressor_total";
const SHARED_COMPRESSOR_VIRTUAL_LABEL = "???? ??";
const SHARED_COMPRESSOR_SETTLEMENT_RATIOS = Object.freeze({});
const SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM = Object.freeze({});
const SHARED_COMPRESSOR_SETTLEMENT_SOURCE_ID_SET = new Set();

const ICON_SVGS = {
  drying: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3.5v4" />
      <path d="M12 2v6" />
      <path d="M16 3.5v4" />
      <path d="M5 10.5h14l-1.4 8.5H6.4L5 10.5Z" />
      <path d="M9 14.5h6" />
    </svg>
  `,
  packaging: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 19 7v10l-7 4-7-4V7l7-4Z" />
      <path d="M5 7l7 4 7-4" />
      <path d="M12 11v10" />
    </svg>
  `,
  liquid: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c2.8 3.7 6.2 6.6 6.2 10.2a6.2 6.2 0 1 1-12.4 0C5.8 9.6 9.2 6.7 12 3Z" />
      <path d="M9.5 14.2c0 1.5 1.1 2.8 2.5 3.1" />
    </svg>
  `,
  building: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V6.5L12 3l7 3.5V20" />
      <path d="M9 20v-4h6v4" />
      <path d="M8.5 9h.01" />
      <path d="M12 9h.01" />
      <path d="M15.5 9h.01" />
      <path d="M8.5 12.5h.01" />
      <path d="M15.5 12.5h.01" />
    </svg>
  `,
  power_active: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="4" width="15" height="16" rx="3" />
      <path d="M12 7.5v2.5" />
      <path d="M10.4 12.6h1.9l-1.2 4 4-5.2H13l1.1-3.1" />
    </svg>
  `,
  power_reactive: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="4" width="15" height="16" rx="3" />
      <path d="M8.5 11.7c1.1-1.1 2.2-1.1 3.3 0s2.2 1.1 3.3 0" />
      <path d="M8.5 15.3c1.1-1.1 2.2-1.1 3.3 0s2.2 1.1 3.3 0" />
    </svg>
  `,
  equipment: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="13" rx="2.5" />
      <path d="M8 9.5h8" />
      <path d="M8 13.5h5" />
    </svg>
  `,
  manage: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h6" />
      <path d="M14 6h6" />
      <circle cx="12" cy="6" r="2" />
      <path d="M4 12h10" />
      <path d="M18 12h2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M4 18h2" />
      <path d="M10 18h10" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  `,
  resource_electric: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2.8 6.8 13h4.4l-1 8.2L17.2 11H13z" />
    </svg>
  `,
  resource_gas: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c1.1 2.7 4.8 4.8 4.8 8.9A4.8 4.8 0 1 1 7.2 12c0-2.1 1-3.8 2.4-5.2" />
      <path d="M12.4 9.2c.6 1 1.7 1.8 1.7 3.1a2.2 2.2 0 1 1-4.4 0c0-1 .5-1.8 1.3-2.5" />
    </svg>
  `,
};

const CALENDAR_STATUS_BADGE_SVGS = {
  completed: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="m8.8 12.3 2.1 2.1 4.4-4.7" />
    </svg>
  `,
  holiday: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5V5.2" />
      <path d="M12 18.8v1.7" />
      <path d="M3.5 12h1.7" />
      <path d="M18.8 12h1.7" />
      <path d="m6.1 6.1 1.2 1.2" />
      <path d="m16.7 16.7 1.2 1.2" />
      <path d="m16.7 7.3 1.2-1.2" />
      <path d="m6.1 17.9 1.2-1.2" />
    </svg>
  `,
  rain: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 16h7.2a3.8 3.8 0 0 0 .4-7.6 4.8 4.8 0 0 0-9 .9A3.3 3.3 0 0 0 8 16Z" />
      <path d="m9 18-1 2" />
      <path d="m13 18-1 2" />
      <path d="m17 18-1 2" />
    </svg>
  `,
};

const FIELD_LABELS = [
  "Exhaust Fan",
  "Supply Fan",
  "Process Alpha",
  "Process Delta",
  "Auto Loader",
  "Demo Boiler A",
  "Demo Boiler B",
  "Cleanroom 220V",
  "Cleanroom 380V",
  "Compressor 220V",
  "Compressor 380V",
  "Process Beta A",
  "Process Beta B",
  "Compressor",
  "Process Gamma",
  "Process Gamma 2",
  "Admin Area",
  "Admin Area HVAC",
  "Break Area",
  "(빈칸)",
  "중부하(4)",
  "최대부하(5)",
  "경부하(6)",
  "유효전력의 합",
  "중간무효전력(7)",
  "최대무효전력(8)",
  "무효전력의 합",
];

const DEFAULT_USAGE_FACTOR = 1;
const TOTAL_POWER_USAGE_FACTOR = 1800;
const EQUIPMENT_USAGE_FACTORS = {
  exhaustfan: 414.5,
  supplyfan: 207,
  processalpha: 552.73,
  processdelta: 207.27,
  autoloader: 40,
  demoboilera: 20,
  "demoboilerb": 12,
  "cleanroom220v": 30,
  "cleanroom380v": 30,
  "compressor220v": 40,
  "compressor380v": 60,
  processbetaa: 120,
  processbetab: 80,
  Compressor: 30,
  linegammacompressor: 30,
  processgamma: 1,
  processgamma1: 1,
  processgamma2: 120,
  adminarea: 100,
  adminareahvac: 100,
  breakarea: 1,
  중부하4: TOTAL_POWER_USAGE_FACTOR,
  최대부하5: TOTAL_POWER_USAGE_FACTOR,
  경부하6: TOTAL_POWER_USAGE_FACTOR,
  전력총량: TOTAL_POWER_USAGE_FACTOR,
  기타: 1,
};

const ACTIVE_POWER_LABEL_KEYS = new Set(
  ["중부하(4)", "최대부하(5)", "경부하(6)"].map(normalizeEquipmentFactorLabel)
);
const REACTIVE_POWER_LABEL_KEYS = new Set(
  ["중간무효전력(7)", "최대무효전력(8)"].map(normalizeEquipmentFactorLabel)
);
const REACTIVE_USAGE_EXCLUDED_LABEL_KEYS = new Set(
  ["중간무효전력(7)", "최대무효전력(8)", "무효전력의 합"].map(
    normalizeEquipmentFactorLabel
  )
);
const SUMMARY_ONLY_LABEL_KEYS = new Set(
  ["유효전력의 합", "무효전력의 합", "(빈칸)"].map(normalizeEquipmentFactorLabel)
);
const ACTIVE_POWER_DEFAULT_IDS = new Set(["field_21", "field_22", "field_23"]);
const REACTIVE_POWER_DEFAULT_IDS = new Set(["field_25", "field_26"]);
const REACTIVE_USAGE_EXCLUDED_DEFAULT_IDS = new Set(["field_25", "field_26", "field_27"]);
const SUMMARY_ONLY_DEFAULT_IDS = new Set(["field_20", "field_24", "field_27"]);
const OTHER_EQUIPMENT_LABEL_KEY = normalizeEquipmentFactorLabel("기타");
const OTHER_EQUIPMENT_DEFAULT_ID = "field_28";
const EQUIPMENT_DISPLAY_LABEL_OVERRIDES = Object.freeze({
  linegammalngtotal: "LNG 합계",
  "lng합계": "LNG 합계",
  demoboilera: "Demo Boiler A",
  "demoboilerb": "Demo Boiler B",
});
const DEFAULT_TEAM_ASSIGNMENT_LABEL_KEYS = {
  [TOTAL_POWER_TEAM_KEY]: new Set(
    ["중부하(4)", "최대부하(5)", "경부하(6)"].map(normalizeEquipmentFactorLabel)
  ),
  team_01_02: new Set(
    [
      "Exhaust Fan",
      "Supply Fan",
      "Process Alpha",
      "Demo Heater (LPG)",
      "Process Delta",
      "Auto Loader",
      "Demo Boiler A",
      "Demo Boiler A",
      "Demo Boiler B",
      "Cleanroom 220V",
      "Cleanroom 380V",
      "Compressor 220V",
      "Compressor 380V",
    ].map(normalizeEquipmentFactorLabel)
  ),
  team_02: new Set(
    ["Process Beta A", "Process Beta B", "Compressor", "Line Gamma LNG Total", "LNG 합계"].map(
      normalizeEquipmentFactorLabel
    )
  ),
  team_03: new Set(["Process Gamma", "Process Gamma 2", "Process Gamma Boiler"].map(normalizeEquipmentFactorLabel)),
  team_04: new Set(
    ["Admin Area", "기타", "Admin Area HVAC", "Break Area"].map(normalizeEquipmentFactorLabel)
  ),
  power_reactive: new Set(
    ["중간무효전력(7)", "최대무효전력(8)"].map(normalizeEquipmentFactorLabel)
  ),
};

const DEFAULT_EQUIPMENT_ITEMS = [
  ...FIELD_LABELS.map((label, index) => ({
    id: `field_${String(index + 1).padStart(2, "0")}`,
    label,
    factor: getDefaultUsageFactorByLabel(label),
  })),
  {
    id: OTHER_EQUIPMENT_DEFAULT_ID,
    label: "기타",
    factor: getDefaultUsageFactorByLabel("기타"),
  },
];
const DEFAULT_ELECTRIC_EQUIPMENT_ITEM_BY_ID = new Map(
  DEFAULT_EQUIPMENT_ITEMS.map((item) => [item.id, item])
);

const DEFAULT_GAS_EQUIPMENT_ITEMS = GAS_METER_ITEM_DEFINITIONS.map((item) => ({
  ...item,
  decimalDigits: 0,
}));

const GAS_TOTAL_USAGE_EQUIPMENT_ID = "gas_field_01";
const GAS_LPG_CORRECTION_EQUIPMENT_ID = "gas_field_02";
const GAS_LPG_CORRECTION_USAGE_FACTOR = 3.35;
const GAS_TEAM_FORCED_ASSIGNMENTS = Object.freeze({
  [GAS_TOTAL_USAGE_EQUIPMENT_ID]: "team_02",
  [GAS_LPG_CORRECTION_EQUIPMENT_ID]: "team_01_02",
});
const GAS_FIXED_TEAM_EQUIPMENT_IDS = Object.freeze({
  [GAS_PLANT_A_LNG_TEAM_KEY]: Object.freeze(["gas_field_03", "gas_field_04"]),
  [GAS_PLANT_A_LPG_TEAM_KEY]: Object.freeze([GAS_LPG_CORRECTION_EQUIPMENT_ID]),
  team_03: Object.freeze(["gas_field_06"]),
  team_04: Object.freeze(["gas_field_05"]),
});
const GAS_SETTLEMENT_SCOPE_TEAM_KEYS = Object.freeze({
  [GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY]: Object.freeze([
    GAS_PLANT_A_LNG_TEAM_KEY,
    "team_03",
  ]),
  [GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY]: Object.freeze([GAS_PLANT_A_LPG_TEAM_KEY]),
});
const GAS_CORRECTION_TARGET_IDS = new Set(["gas_field_03", "gas_field_04", "gas_field_06"]);
const GAS_CORRECTION_SOURCE_IDS = ["gas_field_03", "gas_field_04", "gas_field_06"];
const GAS_READING_VALIDATION_COMPARISON_EXCEPTIONS = new Set();
const GAS_MONTHLY_BOUNDARY_READING_OVERRIDES = Object.freeze({});
const GAS_CORRECTION_MONTH_HINTS = Object.freeze({});
const LEGACY_SHIFTED_GAS_ENTRY_START_DATE = "9999-12-31";
const LEGACY_SHIFTED_GAS_ENTRY_END_DATE = "0000-01-01";
const LEGACY_GAS_2025_02_SHIFT_CUTOFF_UPDATED_AT = "";
const LEGACY_GAS_2025_02_DATE_SHIFT_MAP = new Map();

const ENTRY_DAY_STATUS_ORDER = ["", "completed", "holiday"];
const ENTRY_DAY_STATUS_META = {
  "": {
    label: "",
    buttonClassName: "",
    calendarClassName: "",
    badgeText: "",
  },
  completed: {
    label: "완료",
    buttonClassName: "",
    calendarClassName: "",
    badgeText: "완료",
  },
  holiday: {
    label: "",
    buttonClassName: "",
    calendarClassName: "",
    badgeText: "",
  },
  rain: {
    label: "",
    buttonClassName: "",
    calendarClassName: "",
    badgeText: "",
  },
};

const state = {
  store: loadStore(),
  currentMonth: "",
  selectedDate: "",
  selectedCalendarDates: [],
  loadedSnapshot: "",
  cleanStatusText: "저장된 기록이 없습니다.",
  openTeamPickerKey: "",
  openEquipmentManageKey: "",
  openEquipmentOrderMenu: false,
  openEquipmentAddMenu: false,
  openQuickEntryMenu: false,
  quickEntryResults: [],
  selectedEquipmentKeys: [],
  selectedTeamKey: "",
  selectedTeamKeys: [],
  teamPickerSelections: {},
  teamCalendarSelections: {},
  isEquipmentFullscreen: false,
  selectionDisplayMode: "monthly",
  calendarSelectionAnchorDate: "",
  equipmentSelectionAnchorKey: "",
  teamSelectionAnchorKey: "",
  eventsBound: false,
  isBillingDocumentUploading: false,
  isTeamSettlementPanelOpen: false,
  activeTeamSettlementScope: DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY,
};

const TOTAL_POWER_CARD_PREFERRED_LABEL_ORDER = Object.freeze(
  ["Line Alpha", "중부하(4)", "최대부하(5)", "경부하(6)"].map(normalizeEquipmentFactorLabel)
);
const TOTAL_POWER_CARD_PREFERRED_LABEL_ORDER_MAP = Object.freeze(
  Object.fromEntries(
    TOTAL_POWER_CARD_PREFERRED_LABEL_ORDER.map((labelKey, index) => [labelKey, index])
  )
);

const equipmentReadingTimelineCache = new Map();
const equipmentValidationReadingTimelineCache = new Map();

const equipmentTitleInteractionState = {
  clickTimeoutId: 0,
};

const localFilePersistenceState = {
  billingDocumentDirectoryHandle: null,
};

const billingDocumentPreviewState = {
  monthValue: "",
  resourceType: "",
  billingDocument: null,
};

const sharedServerPersistenceState = {
  writeChain: Promise.resolve(),
  lastErrorMessage: "",
  meta: getPresetSharedStoreMeta(),
  conflictMeta: null,
};

let equipmentLocalAutosaveTimer = 0;
const QUICK_ENTRY_RESULT_LIMIT = 6;
const QUICK_ENTRY_HIGHLIGHT_DURATION = 1400;

function renderSummary() {
  const summaryInfo = getCurrentMonthlySummaryInfo();
  const usageCard = elements.totalPowerMonthUsageTotal?.parentElement;
  usageCard?.classList.remove("is-focus-highlight");
  usageCard?.classList.add("is-focus-highlight");
  const selectedEquipmentIds = getSelectedEquipmentIds();
  const isGas = isGasResourceType();
  const isWaste = isWasteResourceType();
  const isProduction = isProductionResourceType();
  const isElectricTeamMode = !isProduction && !isGas && !isWaste && getCurrentMode() === MODES.TEAM;

  if (isGas) {
    const isGasTeamMode = getCurrentMode() === MODES.TEAM;
    const focusedGasSummaryInfo =
      getCurrentMode() === MODES.EQUIPMENT && selectedEquipmentIds.length
        ? getMonthlyFocusedSummaryInfo()
        : null;
    const gasPrimarySummaryInfo = isGasTeamMode ? getGasTeamModeSummaryInfo() : summaryInfo;
    const gasSecondarySummaryInfo = isGasTeamMode
      ? getGasTeamModeFocusedSummaryInfo()
      : focusedGasSummaryInfo || getDefaultGasFocusedSummaryInfo();
    const gasStandaloneSummaryInfo = isGasTeamMode
      ? getGasTeamModeStandaloneSummaryInfo()
      : getGasStandaloneSummaryInfo();

    if (elements.totalPowerMonthUsageTotal) {
      elements.totalPowerMonthUsageTotal.textContent = formatDailyUsage(gasPrimarySummaryInfo.value);
    }
    if (elements.summaryFocusLabel) {
      let gasSummaryLabel = gasPrimarySummaryInfo.label;
      if (hasGasMonthlyBoundaryReadingOverrideForMonth()) {
        gasSummaryLabel = `${gasSummaryLabel} · 경계보정 포함`;
      }
      elements.summaryFocusLabel.textContent = gasSummaryLabel;
    }
    if (elements.equipmentMonthUsageTotal) {
      elements.equipmentMonthUsageTotal.textContent = formatDailyUsage(gasSecondarySummaryInfo.value);
    }
    if (elements.equipmentMonthUsageLabel) {
      elements.equipmentMonthUsageLabel.textContent = gasSecondarySummaryInfo.label;
    }
    if (elements.otherMonthUsageTotal) {
      elements.otherMonthUsageTotal.textContent = formatDailyUsage(gasStandaloneSummaryInfo.value);
    }
    if (elements.otherMonthUsageLabel) {
      elements.otherMonthUsageLabel.textContent = gasStandaloneSummaryInfo.label;
    }
    syncCalendarDisplayModeToggleButton();
    syncClearCardSelectionButton();
    syncCalendarPopupWindow();
    return;
  }

  if (isWaste) {
    const overallUsage = calculateWasteOverallMonthlyUsage();
    const plantAUsage = getTeamBoardMonthlyUsage(WASTE_PLANT_A_TEAM_KEY, {
      monthValue: state.currentMonth,
      selectionOnly: true,
    });
    const plantBUsage = getTeamBoardMonthlyUsage(WASTE_PLANT_B_TEAM_KEY, {
      monthValue: state.currentMonth,
      selectionOnly: true,
    });

    if (elements.totalPowerMonthUsageTotal) {
      elements.totalPowerMonthUsageTotal.textContent = formatDailyUsage(overallUsage);
    }
    if (elements.summaryFocusLabel) {
      elements.summaryFocusLabel.textContent = "폐수 총사용량";
    }
    if (elements.equipmentMonthUsageTotal) {
      elements.equipmentMonthUsageTotal.textContent = formatDailyUsage(plantAUsage);
    }
    if (elements.equipmentMonthUsageLabel) {
      elements.equipmentMonthUsageLabel.textContent = "Plant A";
    }
    if (elements.otherMonthUsageTotal) {
      elements.otherMonthUsageTotal.textContent = formatDailyUsage(plantBUsage);
    }
    if (elements.otherMonthUsageLabel) {
      elements.otherMonthUsageLabel.textContent = "Plant B";
    }
    syncCalendarDisplayModeToggleButton();
    syncClearCardSelectionButton();
    syncCalendarPopupWindow();
    return;
  }

  const focusedSummaryInfo =
    getCurrentMode() === MODES.EQUIPMENT && selectedEquipmentIds.length
      ? getMonthlyFocusedSummaryInfo()
      : null;
  const equipmentSummaryInfo = focusedSummaryInfo || {
    value: isElectricTeamMode
      ? getElectricTeamModeEquipmentSummaryUsage()
      : calculateEquipmentGroupMonthlyUsage(
          isProduction ? getAllEquipmentIds() : getEquipmentSummaryIds()
        ),
    label:
      getCurrentMode() === MODES.TEAM
        ? getTeamModeSummaryLabel()
        : isProduction
          ? "입력 항목"
          : "설비 전력",
  };
  const otherUsage = isProduction ? null : calculateOtherMonthlyUsage();
  const summaryValue = isElectricTeamMode
    ? getElectricTeamModeOverallMonthlyUsage()
    : summaryInfo.value;

  if (elements.totalPowerMonthUsageTotal) {
    elements.totalPowerMonthUsageTotal.textContent = formatDailyUsage(summaryValue);
  }
  if (elements.summaryFocusLabel) {
    elements.summaryFocusLabel.textContent = summaryInfo.label;
  }
  if (elements.equipmentMonthUsageTotal) {
    elements.equipmentMonthUsageTotal.textContent = formatDailyUsage(equipmentSummaryInfo.value);
  }
  if (elements.equipmentMonthUsageLabel) {
    elements.equipmentMonthUsageLabel.textContent = equipmentSummaryInfo.label;
  }
  if (elements.otherMonthUsageTotal) {
    elements.otherMonthUsageTotal.textContent = formatDailyUsage(otherUsage);
  }
  if (elements.otherMonthUsageLabel) {
    elements.otherMonthUsageLabel.textContent = "기타";
  }
  syncCalendarDisplayModeToggleButton();
  syncClearCardSelectionButton();
  syncCalendarPopupWindow();
}

function getEquipmentFieldCardDisplayPriority(card) {
  const equipment = getEquipmentItem(card?.dataset.fieldKey || "");
  if (!equipment) {
    return 99;
  }

  if (isOtherEquipment(equipment)) {
    return 2;
  }

  if (card.classList.contains("is-rest-equal") || card.classList.contains("is-inactive")) {
    return 1;
  }

  return 0;
}

function syncEquipmentFieldCardDisplayOrder() {
  if (!elements.fieldsGrid) {
    return;
  }

  const sourceOrder = new Map(
    state.store.equipmentItems.map((item, index) => [item.id, index])
  );
  const cards = [...elements.fieldsGrid.querySelectorAll(".field-card[data-field-key]")];
  if (cards.length < 2) {
    return;
  }

  cards
    .sort((leftCard, rightCard) => {
      const priorityDiff =
        getEquipmentFieldCardDisplayPriority(leftCard) -
        getEquipmentFieldCardDisplayPriority(rightCard);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftIndex = sourceOrder.get(leftCard.dataset.fieldKey || "") ?? Number.MAX_SAFE_INTEGER;
      const rightIndex =
        sourceOrder.get(rightCard.dataset.fieldKey || "") ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    })
    .forEach((card) => {
      elements.fieldsGrid.appendChild(card);
    });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(reader.result instanceof ArrayBuffer ? reader.result : new ArrayBuffer(0));
    });

    reader.addEventListener("error", () => {
      reject(reader.error || new Error("billing_document_read_failed"));
    });

    reader.readAsArrayBuffer(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(String(reader.result || ""));
    });

    reader.addEventListener("error", () => {
      reject(reader.error || new Error("billing_document_read_failed"));
    });

    reader.readAsDataURL(file);
  });
}

function removeEquipmentFieldFromEntries(fieldKey, options = {}) {
  const shouldRemoveDate =
    typeof options.shouldRemoveDate === "function" ? options.shouldRemoveDate : () => true;

  Object.keys(state.store.equipmentEntries).forEach((dateString) => {
    if (!shouldRemoveDate(dateString)) {
      return;
    }

    const entry = state.store.equipmentEntries[dateString];

    delete entry?.values?.[fieldKey];
    delete entry?.statuses?.[fieldKey];
    delete entry?.fieldDayStatuses?.[fieldKey];

    if (!hasEntryData(entry)) {
      delete state.store.equipmentEntries[dateString];
    }
  });
}

function removeEquipmentFromAllTeams(equipmentId) {
  TEAM_GROUPS.forEach((team) => {
    state.store.teamAssignments[team.key] = (state.store.teamAssignments[team.key] || []).filter(
      (itemId) => itemId !== equipmentId
    );
  });
}

function renderTeamMode() {
  syncTeamSettlementButtonState();

  if (!state.currentMonth) {
    syncClearCardSelectionButton();
    return;
  }

  syncTeamCalendarSelectionState();

  const currentTeamGroups = getCurrentTeamGroups();
  syncOpenTeamPickerSelectionState(currentTeamGroups);

  elements.teamUsagePeriodText.textContent = getTeamUsagePeriodText();
  renderTeamSettlementSection();
  renderTeamTotals();
  renderTeamBoards();
  syncTeamSettlementButtonState();

  if (getCurrentMode() === MODES.TEAM) {
    syncSelectedDatePresentation();
  }
  syncClearCardSelectionButton();
}

async function deleteBillingDocumentFromSharedServer(billingDocument) {
  const documentId = normalizeText(billingDocument?.documentId);
  if (!supportsSharedServerPersistence() || !documentId) {
    return false;
  }

  const response = await window.fetch(
    `${SHARED_APP_CONFIG.apiBase.replace(/\/+$/, "")}/files/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`billing_document_delete_failed:${response.status}`);
  }

  return true;
}

async function deleteBillingDocumentStorage(
  billingDocument,
  resourceType = getCurrentResourceType()
) {
  const documentId = normalizeText(billingDocument?.documentId);
  if (documentId) {
    return deleteBillingDocumentFromSharedServer(billingDocument);
  }

  return deleteBillingDocumentFromLocalDirectory(billingDocument, resourceType);
}
