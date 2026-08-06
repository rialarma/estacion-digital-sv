import { supabase } from '../supabase';

export const logAudit = async (tenantId, userId, action, entityType, entityId, details = null, branchId = null) => {
  if (!tenantId || !userId || !action || !entityType || !entityId) return;

  try {
    await supabase.from('audit_logs').insert([{
      tenant_id: tenantId,
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      details: details,
      branch_id: branchId
    }]);
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};
