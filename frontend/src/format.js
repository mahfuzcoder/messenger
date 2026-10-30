const colors = ['rose', 'blue', 'green', 'ochre', 'lilac', 'slate'];

export function idOf(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return String(value);
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '•';
}

export function colorFor(value) {
  const text = String(value || '');
  let hash = 0;
  for (const char of text) hash = (hash + char.charCodeAt(0)) % colors.length;
  return colors[hash];
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
}

export function otherMember(conversation, userId) {
  return (conversation.members || []).find((member) => idOf(member) !== String(userId));
}

export function conversationTitle(conversation, userId) {
  if (conversation.type === 'group') return conversation.name || 'Group';
  return otherMember(conversation, userId)?.name || 'Conversation';
}
