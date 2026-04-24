const ERROR_STATUS_CODES = new Map([
  ['unauthorized', 401],
  ['forbidden', 403],
  ['invalid_credentials', 401],
  ['owner_already_exists', 409],
  ['body_too_large', 413],
  ['invalid_json', 400],
  ['permission_key_mismatch', 400],
  ['permission_key_required', 400],
  ['unknown_module_record', 404],
  ['username_and_password_required', 400],
  ['month_value_required', 400],
  ['empty_file_payload', 400],
  ['unsupported_type', 400],
  ['file_too_large', 413],
  ['not_found', 404]
]);

export function getRouteErrorStatusCode(error) {
  return ERROR_STATUS_CODES.get(error?.message) ?? 500;
}
