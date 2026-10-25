const { AuditLog } = require('../models');

// Fire-and-forget safe: audit failures never break the main request.
exports.logAudit = async (req, action, { entity, entityId, details, actor } = {}) => {
  try {
    const u = actor || (req && req.user);
    await AuditLog.create({
      actor: u && u._id, actorRole: u && u.role, action, entity,
      entityId: entityId ? String(entityId) : undefined, details,
      ip: req && (req.ip || (req.connection && req.connection.remoteAddress)),
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
};
