// Demo workflow v1.0. A real deployment must enforce these rules on its server.
export const canEdit = (status, role) => role === 'author' && ['draft', 'revision'].includes(status);
export function transition(status, action, role) {
  if (action === 'submit' && canEdit(status, role)) return 'review';
  if (status === 'review' && role === 'reviewer') {
    if (action === 'request') return 'revision';
    if (action === 'accept') return 'accepted';
  }
  throw new Error('Invalid workflow transition');
}
