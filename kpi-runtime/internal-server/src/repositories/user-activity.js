import { query } from '../db/pool.js';

function normalizeLimit(limit, fallback = 3, max = 5) {
  const parsed = Number.parseInt(String(limit || ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export async function listRecentUserDataChanges(userIds = [], limitPerUser = 3) {
  const normalizedUserIds = Array.isArray(userIds)
    ? userIds.map((userId) => String(userId || '').trim()).filter(Boolean)
    : [];
  if (!normalizedUserIds.length) {
    return [];
  }

  const safeLimit = normalizeLimit(limitPerUser);
  const result = await query(
    `with change_candidates as (
        select
          r.updated_by_user_id as user_id,
          r.updated_at as changed_at,
          case when r.version <= 1 then 'create' else 'update' end as change_type,
          r.module_key,
          r.record_key,
          null::text as owner_domain,
          null::text as owner_key,
          null::text as file_category,
          null::text as original_name
        from app_module_records r
        where r.updated_by_user_id = any($1::uuid[])

        union all

        select
          d.uploaded_by_user_id as user_id,
          d.created_at as changed_at,
          'create' as change_type,
          coalesce(d.metadata->>'moduleKey', '') as module_key,
          coalesce(d.metadata->>'recordKey', '') as record_key,
          d.owner_domain,
          d.owner_key,
          d.file_category,
          d.original_name
        from app_documents d
        where d.uploaded_by_user_id = any($1::uuid[])
      ),
      ranked_changes as (
        select
          user_id,
          changed_at,
          change_type,
          module_key,
          record_key,
          owner_domain,
          owner_key,
          file_category,
          original_name,
          row_number() over (
            partition by user_id
            order by changed_at desc, module_key asc, record_key asc, original_name asc
          ) as row_num
        from change_candidates
      )
      select
        user_id,
        changed_at,
        change_type,
        module_key,
        record_key,
        owner_domain,
        owner_key,
        file_category,
        original_name
      from ranked_changes
      where row_num <= $2
      order by user_id asc, changed_at desc`,
    [normalizedUserIds, safeLimit]
  );

  return result.rows;
}
