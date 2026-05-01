import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDocumentStorage } from '../../src/lib/document-storage.js';

test('equipment documents are stored below the equipment-name folder', () => {
  const photo = resolveDocumentStorage({
    ownerDomain: 'data.equipment_history',
    ownerKey: 'EQ-001',
    fileCategory: 'photo',
    metadata: { equipmentName: 'Mixer A' },
  });
  const attachment = resolveDocumentStorage({
    ownerDomain: 'audit.legal_facility',
    ownerKey: 'legal-001',
    fileCategory: 'attachment',
    metadata: { facilityName: 'Boiler 1' },
  });

  assert.deepEqual(photo.storageFolder, ['equipment-assets', 'equipment-history', 'Mixer A', 'images']);
  assert.equal(photo.metadata.storageFolder, 'equipment-assets/equipment-history/Mixer A/images');
  assert.deepEqual(attachment.storageFolder, ['equipment-assets', 'legal-facility', 'Boiler 1', 'attachments']);
  assert.equal(attachment.metadata.storageFolder, 'equipment-assets/legal-facility/Boiler 1/attachments');
});
