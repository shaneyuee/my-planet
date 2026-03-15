import db from '../db.js';

const MENTION_REGEX = /@\[([^\]]+)\]\((\d+)\)/g;

export function extractMentionedUserIds(content) {
  if (!content) return [];
  const ids = [];
  let match;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    ids.push(parseInt(match[2]));
  }
  MENTION_REGEX.lastIndex = 0;
  return [...new Set(ids)];
}

export function createMentionNotifications(userIds, actorId, targetType, targetId, excludeUserIds = []) {
  const excludeSet = new Set([actorId, ...excludeUserIds]);
  const insert = db.prepare(
    "INSERT INTO notifications (recipient_id, actor_id, type, target_type, target_id) VALUES (?, ?, 'mention', ?, ?)"
  );
  for (const uid of userIds) {
    if (!excludeSet.has(uid)) {
      try {
        insert.run(uid, actorId, targetType, targetId);
      } catch {}
    }
  }
}
