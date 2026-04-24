import { query } from '../db/pool.js';

export async function createDocumentRecord(input) {
  const result = await query(
    `insert into app_documents
      (permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
     returning id, permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id, created_at`,
    [
      input.permissionKey,
      input.ownerDomain,
      input.ownerKey,
      input.fileCategory,
      input.originalName,
      input.storedName,
      input.mimeType,
      input.byteSize,
      input.storageRelPath,
      JSON.stringify(input.metadata ?? {}),
      input.uploadedByUserId || null
    ]
  );
  return result.rows[0];
}

export async function findDocumentById(documentId) {
  const result = await query(
    `select id, permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id, created_at
     from app_documents
     where id = $1`,
    [documentId]
  );
  return result.rows[0] || null;
}

export async function deleteDocumentById(documentId) {
  const result = await query(
    `delete from app_documents
     where id = $1
     returning id, permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id, created_at`,
    [documentId]
  );
  return result.rows[0] || null;
}

export async function findLatestDocumentByOwner({
  ownerDomain,
  ownerKey,
  fileCategory
}) {
  const result = await query(
    `select id, permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id, created_at
     from app_documents
     where owner_domain = $1
       and owner_key = $2
       and file_category = $3
     order by created_at desc
     limit 1`,
    [ownerDomain, ownerKey, fileCategory]
  );
  return result.rows[0] || null;
}

export async function updateDocumentStorageLocation({
  documentId,
  storageRelPath,
  metadata
}) {
  const result = await query(
    `update app_documents
        set storage_rel_path = $2,
            metadata = $3::jsonb
      where id = $1
      returning id, permission_key, owner_domain, owner_key, file_category, original_name, stored_name, mime_type, byte_size, storage_rel_path, metadata, uploaded_by_user_id, created_at`,
    [
      documentId,
      storageRelPath,
      JSON.stringify(metadata ?? {})
    ]
  );
  return result.rows[0] || null;
}
