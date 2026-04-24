import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const formattingSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/formatting.js',
    import.meta.url
  ),
  'utf8'
);

function createFormattingContext() {
  const RealDate = Date;
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length) {
        super(...args);
        return;
      }

      super('2026-04-20T15:34:56+09:00');
    }

    static now() {
      return new RealDate('2026-04-20T15:34:56+09:00').valueOf();
    }
  }

  const context = {
    console,
    Date: MockDate,
    Intl,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(formattingSource, context, {
    filename: 'runtime/formatting.js',
  });
  return context;
}

test('runtime formatting normalizes text and month-like values', () => {
  const context = createFormattingContext();

  assert.equal(context.normalizeText('  전기   사용량  '), '전기 사용량');
  assert.equal(context.normalizeMonthValue(' 2026-04 '), '2026-04');
  assert.equal(context.normalizeMonthValue('2026-4'), '');
  assert.equal(context.formatMonthTitle('2026-04'), '2026년 04월');
  assert.equal(context.formatBillingDocumentMonthLabel('2026-04'), '26.04');
});

test('runtime formatting formats numbers and usage shares predictably', () => {
  const context = createFormattingContext();

  assert.equal(context.roundCalculatedUsage(12.49), 12);
  assert.equal(context.roundCalculatedUsage(-0.1), 0);
  assert.equal(context.formatNumber(1234.567), '1,234.57');
  assert.equal(context.formatFixedDecimalNumber(12.3, 3), '12.300');
  assert.equal(context.formatWholeNumber(1234.4), '1,234');
  assert.equal(context.formatUsageShare(0.125), '12.5%');
  assert.equal(context.formatUsageShare(null), '-');
});

test('runtime formatting resolves date helpers and entry normalization', () => {
  const context = createFormattingContext();

  assert.equal(context.formatDate(new Date('2026-04-20T00:00:00')), '2026-04-20');
  assert.equal(context.getMonthValue(new Date('2026-04-20T00:00:00')), '2026-04');
  assert.equal(context.getNextDateString('2026-04-20'), '2026-04-21');
  assert.equal(context.isFutureDate('2026-04-21'), true);
  assert.equal(context.isFutureDate('2026-04-20'), false);
  assert.equal(context.normalizeEntryValue(' 1,234.50 '), '1234.50');
  assert.equal(context.normalizeEntryValue(42), '42');
  assert.equal(context.getEntryFractionDigits('12.340'), 3);
});

test('runtime formatting detects broken Korean mojibake candidates conservatively', () => {
  const context = createFormattingContext();

  assert.equal(context.looksLikeBrokenKoreanText('정상 한글'), false);
  assert.equal(context.looksLikeBrokenKoreanText('???'), true);
});
