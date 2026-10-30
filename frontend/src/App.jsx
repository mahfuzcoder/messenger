/** Nook Messenger React interface connected to the Express + MongoDB API. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, mediaUrl } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import { colorFor, conversationTitle, formatTime, idOf, initials, otherMember } from './format.js';

function mapMessage(message, userId) {
  const sender = message.sender || {};
  const fromMe = idOf(sender) === String(userId) || idOf(message.sender) === String(userId);
  const attachments = message.mediaUrl ? [{ name: message.fileName || 'Attachment', kind: message.type === 'text' ? 'file' : message.type, url: mediaUrl(message.mediaUrl) }] : [];
  return {
    id: idOf(message),
    from: fromMe ? 'me' : 'them',
    sender: sender.name,
    text: message.deleted ? 'This message was deleted.' : message.text,
    time: formatTime(message.createdAt),
    read: (message.readBy || []).length > 1,
    attachments,
    deleted: Boolean(message.deleted)
  };
}

function mapConversation(conversation, userId, presence) {
  const id = idOf(conversation);
  const peer = otherMember(conversation, userId);
  const title = conversationTitle(conversation, userId);
  const last = conversation.lastMessage;
  const previewText = last?.deleted ? 'Message deleted' : last?.text || last?.fileName || (conversation.type === 'group' ? 'Group conversation' : 'Say hello 👋');
  return {
    ...conversation,
    id,
    name: title,
    initials: initials(title),
    color: colorFor(id),
    online: Boolean(peer && presence[idOf(peer)]),
    group: conversation.type === 'group',
    status: conversation.type === 'group'
      ? `${(conversation.members || []).length} members`
      : (peer && presence[idOf(peer)] ? 'Online now' : 'Offline'),
    role: conversation.type === 'group' ? 'Group conversation' : 'Nook member',
    preview: last ? `${last.sender && idOf(last.sender) === String(userId) ? 'You' : last.sender?.name || 'They'}: ${previewText}` : previewText,
    time: formatTime(last?.createdAt || conversation.lastMessageAt || conversation.updatedAt),
    unread: conversation.unreadCount || 0,
    avatar: mediaUrl(conversation.type === 'group' ? conversation.avatar : peer?.avatar),
    messages: conversation.messages || []
  };
}

function Avatar({ initials: label, color, online = false, size = '', src = '' }) {
  return (
    <span className={`avatar ${color} ${size}`}>
      {src ? <img src={src} alt="" /> : label}
      {online && <i />}
    </span>
  );
}

function ConversationRow({ conversation, selected, onSelect }) {
  return (
    <button className={`conversation ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <Avatar initials={conversation.initials} color={conversation.color} online={conversation.online} src={conversation.avatar} />
      <span className="conversation-copy">
        <span className="conversation-top"><strong>{conversation.name}</strong><time>{conversation.time}</time></span>
        <span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread > 0 && <b className="unread-count">{conversation.unread}</b>}</span>
      </span>
    </button>
  );
}

function Message({ message, group }) {
  return (
    <div className={`message-row ${message.from === 'me' ? 'outgoing' : ''}`}>
      {message.from === 'them' && group && <span className="sender-name">{message.sender || 'Member'}</span>}
      <div className="bubble">
        {message.text && <span>{message.text}</span>}
        {message.attachments?.map((file, index) => <AttachmentPreview key={`${file.name}-${index}`} file={file} />)}
        <div className="message-meta">
          <time>{message.time}</time>
          {message.from === 'me' && <span className={`checks ${message.read ? 'read' : ''}`} aria-label={message.read ? 'Seen' : 'Sent'}>{message.read ? '✓✓' : '✓'}</span>}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ file, removable = false, onRemove }) {
  if (file.kind === 'image') {
    return (
      <div className="attachment-image-wrap">
        {file.url ? <img className="attachment-image" src={file.url} alt={file.name} /> : <span className="attachment-file-icon">▧</span>}
        {removable && <button type="button" className="attachment-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>×</button>}
      </div>
    );
  }
  return (
    <div className="attachment-file-card">
      <span className="attachment-file-icon">{file.kind === 'video' ? '▶' : file.kind === 'audio' ? '♫' : '▤'}</span>
      <span><strong>{file.name}</strong><small>{file.kind === 'video' ? 'Video' : file.kind === 'audio' ? 'Audio' : 'File'} · {formatFileSize(file.size)}</small></span>
      {removable && <button type="button" className="attachment-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>×</button>}
    </div>
  );
}

function formatFileSize(size = 0) {
  if (!size) return 'Attachment';
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function NewChatDialog({ open, query, setQuery, people, onSelect, onClose }) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
        <div className="dialog-head">
          <div><span className="eyebrow">START SOMETHING</span><h2 id="new-chat-title">New conversation</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><img className="ui-icon" src="/icons/close.svg" alt="" /></button>
        </div>
        <label className="search dialog-search">
          <span><img className="ui-icon" src="/icons/search.svg" alt="" /></span>
          <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone by name or email" />
        </label>
        <div className="people-results">
          {people.length ? people.map((person) => (
            <button className="person-result" key={person.id} onClick={() => onSelect(person)}>
              <Avatar initials={initials(person.name)} color={colorFor(person.id)} src={mediaUrl(person.avatar)} />
              <span><strong>{person.name}</strong><small>{person.email}</small></span>
              <span className="person-add"><img src="/icons/plus.svg" alt="" /></span>
            </button>
          )) : (
            <div className="empty-list">
              <strong>{query.trim().length < 2 ? 'Search for a person' : 'No one found'}</strong>
              <small>{query.trim().length < 2 ? 'Type at least two letters to find people on Nook.' : 'Try another name or email.'}</small>
            </div>
          )}
        </div>
        <p className="dialog-note">People you start a chat with will appear in your inbox.</p>
      </section>
    </div>
  );
}

function SettingToggle({ title, description, defaultChecked = false }) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return (
    <div className="setting-toggle">
      <span><strong>{title}</strong><small>{description}</small></span>
      <button type="button" role="switch" aria-checked={enabled} aria-label={title} className={`switch ${enabled ? 'on' : ''}`} onClick={() => setEnabled((value) => !value)}><i /></button>
    </div>
  );
}

function SettingsPage({ tab, setTab, user, onBack, onLogout, onSaveProfile, onChangePhoto, showToast, toast }) {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const photoInput = useRef(null);
  const sections = ['Profile', 'Appearance', 'Notifications', 'Privacy & security'];
  const avatarLabel = initials(user?.name);
  return (
    <main className="settings-shell">
      <nav className="rail" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="Nook home" onClick={(event) => { event.preventDefault(); onBack(); }}>n</a>
        <div className="rail-links">
          <button className="rail-link" onClick={onBack} aria-label="Messages"><span className="icon"><img src="/icons/messages.svg" alt="" /></span><small>Messages</small></button>
          <button className="rail-link" onClick={onBack} aria-label="People"><span className="icon"><img src="/icons/people.svg" alt="" /></span><small>People</small></button>
          <button className="rail-link" aria-label="Saved"><span className="icon"><img src="/icons/saved.svg" alt="" /></span><small>Saved</small></button>
          <button className="rail-link" aria-label="Archive"><span className="icon"><img src="/icons/archive.svg" alt="" /></span><small>Archive</small></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-link active" aria-label="Settings"><span className="icon"><img src="/icons/settings.svg" alt="" /></span><small>Settings</small></button>
          <button className="user-mini" aria-label="Your profile">{avatarLabel}</button>
        </div>
      </nav>
      <section className="settings-main">
        <header className="settings-topbar">
          <div><span className="eyebrow">YOUR NOOK</span><h1>Settings</h1></div>
          <button className="settings-back" onClick={onBack}>‹ <span>Back to messages</span></button>
        </header>
        <div className="settings-layout">
          <aside className="settings-nav" aria-label="Settings sections">
            <p>ACCOUNT</p>
            {sections.map((name, i) => (
              <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
                <span><img className="settings-nav-icon" src={['/icons/profile.svg', '/icons/appearance.svg', '/icons/notification.svg', '/icons/privacy.svg'][i]} alt="" /></span>
                {name}
              </button>
            ))}
            <div className="settings-help">
              <strong>Need a hand?</strong>
              <small>We’re always happy to help.</small>
              <button onClick={() => showToast('Support is not connected yet.')}>Contact support →</button>
            </div>
          </aside>
          <div className="settings-content">
            {tab === 'Profile' && (
              <>
                <div className="settings-heading">
                  <div><h2>Profile</h2><p>Manage how you show up to your people.</p></div>
                  <button className="save-settings" onClick={async () => { await onSaveProfile(name); setSaved(true); showToast('Your settings have been saved.'); window.setTimeout(() => setSaved(false), 1800); }}>{saved ? 'Saved ✓' : 'Save changes'}</button>
                </div>
                <div className="settings-card">
                  <div className="profile-edit">
                    <span className="avatar avatar-xl rose">{user?.avatar ? <img src={mediaUrl(user.avatar)} alt="" /> : avatarLabel}</span>
                    <div><strong>Your photo</strong><small>JPG or PNG, up to 5 MB.</small></div>
                    <input ref={photoInput} className="hidden-file-input" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onChangePhoto(event.target.files[0])} />
                    <button type="button" onClick={() => photoInput.current?.click()}>Change photo</button>
                  </div>
                  <div className="settings-fields">
                    <label>Display name<input type="text" value={name} onChange={(event) => setName(event.target.value)} /></label>
                    <label>Email address<input type="email" value={user?.email || ''} readOnly /></label>
                    <label>About you<textarea defaultValue="Always up for a good conversation." rows="3" /></label>
                  </div>
                </div>
                <div className="settings-card security-row">
                  <div><h3>Account session</h3><p>Sign out of Nook on this device.</p></div>
                  <button onClick={onLogout}>Sign out</button>
                </div>
              </>
            )}
            {tab === 'Appearance' && (
              <>
                <div className="settings-heading"><div><h2>Appearance</h2><p>Make Nook feel comfortable to use.</p></div></div>
                <div className="settings-card">
                  <div className="settings-card-title"><div><h3>Theme</h3><p>Choose how Nook looks on this device.</p></div></div>
                  <div className="theme-options">{[['Light', '/icons/sun.svg'], ['System', '/icons/appearance.svg'], ['Dark', '/icons/moon.svg']].map(([name, icon]) => (
                    <button key={name} className={`theme-option ${name === 'Light' ? 'selected' : ''}`} onClick={() => name !== 'Light' && showToast(`${name} theme is coming soon.`)}>
                      <span><img src={icon} alt="" /></span><strong>{name}</strong>{name === 'Light' && <i>✓</i>}
                    </button>
                  ))}</div>
                </div>
              </>
            )}
            {tab === 'Notifications' && (
              <>
                <div className="settings-heading"><div><h2>Notifications</h2><p>Choose what you’d like to hear about.</p></div></div>
                <div className="settings-card settings-toggles">
                  <SettingToggle title="Message notifications" description="Get notified when someone messages you." defaultChecked />
                  <SettingToggle title="Group conversations" description="Get notified about activity in your groups." defaultChecked />
                </div>
              </>
            )}
            {tab === 'Privacy & security' && (
              <>
                <div className="settings-heading"><div><h2>Privacy &amp; security</h2><p>Take care of your account and personal space.</p></div></div>
                <div className="settings-card settings-toggles">
                  <SettingToggle title="Read receipts" description="Let people know when you’ve read their messages." defaultChecked />
                  <SettingToggle title="Online status" description="Show when you’re currently active on Nook." defaultChecked />
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [accountUser, setAccountUser] = useState(null);
  const [authPage, setAuthPage] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [presence, setPresence] = useState({});
  const [activeId, setActiveId] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [toast, setToast] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [muted, setMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Profile');
  const [typingName, setTypingName] = useState('');
  const timer = useRef(null);
  const typingTimer = useRef(null);
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const audioInput = useRef(null);
  const fileInput = useRef(null);
  const userId = accountUser?.id;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const mapped = useMemo(
    () => conversations.map((conversation) => mapConversation(conversation, userId, presence)),
    [conversations, userId, presence]
  );
  const active = mapped.find((conversation) => conversation.id === activeId) || mapped[0];

  useEffect(() => {
    api('/api/auth/me').then(async (data) => {
      setAccountUser(data.user);
      setSignedIn(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!signedIn || !userId) return undefined;
    let activeSocket;
    (async () => {
      const data = await api('/api/conversations');
      const rows = data.conversations || [];
      setConversations(rows);
      const firstId = idOf(rows[0]);
      if (firstId) {
        setActiveId(firstId);
        const thread = await api(`/api/conversations/${firstId}/messages`);
        const messages = [...(thread.messages || [])].reverse().map((item) => mapMessage(item, userId));
        setConversations((current) => current.map((conversation) => idOf(conversation) === firstId ? { ...conversation, messages, unreadCount: 0 } : conversation));
      }
      activeSocket = connectSocket();
      if (firstId) {
        activeSocket.emit('conversation:join', firstId);
        activeSocket.emit('message:read', firstId);
      }
      activeSocket.on('presence:snapshot', ({ onlineUserIds }) => {
        setPresence(Object.fromEntries((onlineUserIds || []).map((id) => [id, true])));
      });
      activeSocket.on('presence:update', ({ userId: id, online }) => {
        setPresence((current) => ({ ...current, [id]: online }));
      });
      activeSocket.on('message:new', (payload) => {
        const conversationId = idOf(payload.conversation) || payload.conversation;
        upsertMessage(conversationId, payload, userId);
      });
      activeSocket.on('conversation:updated', ({ conversationId, lastMessage, unreadCount, avatar }) => {
        setConversations((current) => current.map((conversation) => {
          if (idOf(conversation) !== String(conversationId)) return conversation;
          return {
            ...conversation,
            avatar: avatar == null ? conversation.avatar : avatar,
            lastMessage: lastMessage || conversation.lastMessage,
            lastMessageAt: lastMessage?.createdAt || conversation.lastMessageAt,
            unreadCount: unreadCount == null ? conversation.unreadCount : unreadCount
          };
        }));
      });
      activeSocket.on('message:deleted', ({ messageId, conversationId }) => {
        setConversations((current) => current.map((conversation) => idOf(conversation) !== String(conversationId) ? conversation : {
          ...conversation,
          messages: (conversation.messages || []).map((item) => item.id === messageId ? { ...item, text: 'This message was deleted.', attachments: [], deleted: true } : item)
        }));
      });
      activeSocket.on('message:read', ({ conversationId }) => {
        setConversations((current) => current.map((conversation) => idOf(conversation) !== String(conversationId) ? conversation : {
          ...conversation,
          messages: (conversation.messages || []).map((item) => item.from === 'me' ? { ...item, read: true } : item)
        }));
      });
      activeSocket.on('typing', ({ conversationId, name }) => {
        if (String(conversationId) === String(activeId)) setTypingName(name);
      });
      activeSocket.on('typing:stop', ({ conversationId }) => {
        if (String(conversationId) === String(activeId)) setTypingName('');
      });
    })().catch((error) => showToast(error.message));
    return () => {
      disconnectSocket();
    };
  }, [signedIn, userId]);

  useEffect(() => {
    if (!peopleSearch.trim() || peopleSearch.trim().length < 2) {
      setPeople([]);
      return undefined;
    }
    const handle = window.setTimeout(() => {
      api(`/api/users?q=${encodeURIComponent(peopleSearch.trim())}`).then((data) => setPeople(data.users || [])).catch(() => setPeople([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [peopleSearch]);

  const visibleConversations = useMemo(() => mapped.filter((conversation) => {
    const matchesSearch = `${conversation.name} ${conversation.preview}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'unread' && conversation.unread > 0) || (filter === 'groups' && conversation.group);
    return matchesSearch && matchesFilter;
  }), [mapped, filter, search]);

  function showToast(text) {
    setToast(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2500);
  }

  function upsertMessage(conversationId, payload, currentUserId) {
    const mappedMessage = mapMessage(payload, currentUserId);
    setConversations((current) => {
      const exists = current.some((conversation) => idOf(conversation) === String(conversationId));
      if (!exists) {
        api('/api/conversations').then((data) => setConversations(data.conversations || [])).catch(() => {});
        return current;
      }
      return current.map((conversation) => {
        if (idOf(conversation) !== String(conversationId)) return conversation;
        const messages = conversation.messages || [];
        if (messages.some((item) => item.id === mappedMessage.id)) return conversation;
        return {
          ...conversation,
          lastMessage: payload,
          lastMessageAt: payload.createdAt,
          messages: [...messages, mappedMessage],
          unreadCount: String(conversationId) === String(activeIdRef.current) || mappedMessage.from === 'me' ? 0 : (conversation.unreadCount || 0) + 1
        };
      });
    });
  }

  async function signIn(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email: form.get('email'), password: form.get('password') } });
      setAccountUser(data.user);
      setSignedIn(true);
    } catch (error) {
      showToast(error.message === 'Failed to fetch' ? 'Could not reach the server. Start the backend and try again.' : error.message);
    }
  }

  async function signUp(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('password') !== data.get('confirmPassword')) {
      showToast('Those passwords don’t match yet.');
      return;
    }
    try {
      const result = await api('/api/auth/signup', { method: 'POST', body: { name: data.get('name'), email: data.get('email'), password: data.get('password') } });
      setAccountUser(result.user);
      setSignedIn(true);
    } catch (error) {
      showToast(error.message === 'Failed to fetch' ? 'Could not reach the server. Start the backend and try again.' : error.message);
    }
  }

  async function selectConversation(id) {
    setActiveId(id);
    setTypingName('');
    document.body.classList.add('mobile-chat-open');
    const socket = connectSocket();
    socket.emit('conversation:join', id);
    socket.emit('message:read', id);
    try {
      const data = await api(`/api/conversations/${id}/messages`);
      const messages = [...(data.messages || [])].reverse().map((item) => mapMessage(item, userId));
      setConversations((current) => current.map((conversation) => idOf(conversation) === String(id) ? { ...conversation, messages, unreadCount: 0 } : conversation));
    } catch (error) {
      showToast(error.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text && !attachments.length || !active) return;
    try {
      for (const item of attachments) {
        const form = new FormData();
        form.append('file', item.file);
        const uploaded = await api('/api/upload', { method: 'POST', body: form });
        const result = await api(`/api/conversations/${active.id}/messages`, { method: 'POST', body: { type: uploaded.type, mediaUrl: uploaded.url, fileName: uploaded.fileName, text: '' } });
        upsertMessage(active.id, result.message, userId);
      }
      if (text) {
        const result = await api(`/api/conversations/${active.id}/messages`, { method: 'POST', body: { type: 'text', text } });
        upsertMessage(active.id, result.message, userId);
      }
      setMessage('');
      setAttachments([]);
      connectSocket().emit('typing:stop', active.id);
    } catch (error) {
      showToast(error.message);
    }
  }

  function addAttachments(event, kind) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const mappedFiles = selected.map((file) => ({ file, name: file.name, size: file.size, kind, url: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '' }));
    setAttachments((current) => [...current, ...mappedFiles]);
    event.target.value = '';
  }

  async function startConversation(person) {
    try {
      const data = await api('/api/conversations', { method: 'POST', body: { recipientId: person.id } });
      const conversation = data.conversation;
      setConversations((current) => {
        const rest = current.filter((item) => idOf(item) !== idOf(conversation));
        return [conversation, ...rest];
      });
      setDialogOpen(false);
      setPeopleSearch('');
      await selectConversation(idOf(conversation));
    } catch (error) {
      showToast(error.message);
    }
  }

  function backToInbox() {
    document.body.classList.remove('mobile-chat-open');
  }

  if (!signedIn && authPage === 'signup') return (
    <main className="login-page signup-page">
      <section className="login-story" aria-label="Welcome to Nook">
        <a className="login-brand" href="#" aria-label="Nook home"><span>n</span> nook</a>
        <div className="story-copy"><span className="eyebrow">MAKE ROOM FOR YOUR PEOPLE</span><h1>Your kind of connection<br />starts <em>right here.</em></h1><p>Bring your favorite people a little closer, one thoughtful conversation at a time.</p></div>
        <div className="story-note"><span className="story-avatars"><i>MC</i><i>JW</i><i>AR</i></span><span><strong>A softer space to stay close.</strong><small>Private conversations, made for you.</small></span><span className="story-spark">✳</span></div>
        <div className="story-art" aria-hidden="true"><div className="art-sun"/><div className="art-window"><span/><span/><span/><span/></div><div className="art-plant">✳</div><div className="art-table"/><div className="art-cup"/></div>
        <span className="story-footer">A GOOD PLACE TO BEGIN</span>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap signup-form-wrap">
          <div className="mobile-login-brand"><span>n</span> nook</div>
          <span className="eyebrow">YOUR NOOK IS WAITING</span><h2>Create your account</h2><p className="login-intro">A little space for the people who matter.</p>
          <form className="login-form" onSubmit={signUp}>
            <label htmlFor="signup-name">Your name</label><input id="signup-name" name="name" type="text" placeholder="How should we call you?" autoComplete="name" required minLength="2" />
            <label className="signup-email-label" htmlFor="signup-email">Email address</label><input id="signup-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <div className="password-label signup-password-label"><label htmlFor="signup-password">Password</label></div>
            <div className="password-field"><input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete="new-password" required minLength="8" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            <div className="password-label signup-password-label"><label htmlFor="signup-confirm-password">Confirm password</label></div>
            <div className="password-field"><input id="signup-confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Enter your password again" autoComplete="new-password" required minLength="8" /><button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? 'Hide' : 'Show'}</button></div>
            <label className="remember-row terms-row"><input type="checkbox" required /><span>I agree to the <button type="button" className="text-link" onClick={() => showToast('Terms will be available soon.')}>Terms</button> and <button type="button" className="text-link" onClick={() => showToast('Privacy details will be available soon.')}>Privacy Policy</button>.</span></label>
            <button className="login-submit" type="submit">Create account <span>→</span></button>
          </form>
          <p className="signup-copy existing-account">Already have an account? <button className="text-link" onClick={() => setAuthPage('login')}>Sign in</button></p>
          <p className="login-privacy"><span>♢</span> Your conversations stay private and secure.</p>
        </div>
        <div className="login-legal">© 2025 Nook <span>Privacy</span><span>Terms</span></div>
      </section>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );

  if (!signedIn) return (
    <main className="login-page">
      <section className="login-story" aria-label="Welcome to Nook">
        <a className="login-brand" href="#" aria-label="Nook home"><span>n</span> nook</a>
        <div className="story-copy"><span className="eyebrow">A LITTLE CLOSER, EVERY DAY</span><h1>Good conversations<br />feel like <em>coming home.</em></h1><p>A quieter place for the people who make your life feel a little more like yours.</p></div>
        <div className="story-note"><span className="story-avatars"><i>MC</i><i>JW</i><i>AR</i></span><span><strong>Your people are here.</strong><small>Pick up right where you left off.</small></span><span className="story-spark">✳</span></div>
        <div className="story-art" aria-hidden="true"><div className="art-sun"/><div className="art-window"><span/><span/><span/><span/></div><div className="art-plant">✳</div><div className="art-table"/><div className="art-cup"/></div>
        <span className="story-footer">MADE FOR THE MOMENTS IN BETWEEN</span>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><span>n</span> nook</div>
          <span className="eyebrow">WELCOME BACK</span><h2>Sign in to your nook</h2><p className="login-intro">Your conversations are right where you left them.</p>
          <form className="login-form" onSubmit={signIn}>
            <label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <div className="password-label"><label htmlFor="login-password">Password</label><button type="button" className="text-link" onClick={() => showToast('Password reset is not connected yet.')}>Forgot password?</button></div>
            <div className="password-field"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required minLength="8" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            <label className="remember-row"><input type="checkbox" defaultChecked /><span>Keep me signed in</span></label>
            <button className="login-submit" type="submit">Sign in <span>→</span></button>
          </form>
          <div className="login-divider"><span>OR CONTINUE WITH</span></div>
          <button className="google-login" type="button" onClick={() => showToast('Google sign-in is not connected yet.')}><b>G</b> Continue with Google</button>
          <p className="signup-copy">New to Nook? <button className="text-link" onClick={() => setAuthPage('signup')}>Create an account</button></p>
          <p className="login-privacy"><span>♢</span> Your conversations stay private and secure.</p>
        </div>
        <div className="login-legal">© 2025 Nook <span>Privacy</span><span>Terms</span></div>
      </section>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );

  if (settingsOpen) {
    return (
      <SettingsPage
        tab={settingsTab}
        setTab={setSettingsTab}
        user={accountUser}
        onBack={() => setSettingsOpen(false)}
        onLogout={async () => {
          await api('/api/auth/logout', { method: 'POST' });
          disconnectSocket();
          setSignedIn(false);
          setAccountUser(null);
          setConversations([]);
          setSettingsOpen(false);
        }}
        onSaveProfile={async (name) => {
          const data = await api('/api/users/me', { method: 'PATCH', body: { name } });
          setAccountUser(data.user);
        }}
        onChangePhoto={async (file) => {
          const form = new FormData();
          form.append('file', file);
          const data = await api('/api/users/me/avatar', { method: 'POST', body: form });
          setAccountUser(data.user);
        }}
        showToast={showToast}
        toast={toast}
      />
    );
  }

  return (
    <main className="app-shell" aria-label="Nook Messenger">
      <nav className="rail" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="Nook home">n</a>
        <div className="rail-links">
          <button className="rail-link active" aria-label="Messages"><span className="icon"><img src="/icons/messages.svg" alt="" /></span><small>Messages</small></button>
          <button className="rail-link" onClick={() => setDialogOpen(true)} aria-label="People"><span className="icon"><img src="/icons/people.svg" alt="" /></span><small>People</small></button>
          <button className="rail-link" onClick={() => showToast('Saved messages will appear here.')} aria-label="Saved"><span className="icon"><img src="/icons/saved.svg" alt="" /></span><small>Saved</small></button>
          <button className="rail-link" onClick={() => showToast('Archived conversations will appear here.')} aria-label="Archive"><span className="icon"><img src="/icons/archive.svg" alt="" /></span><small>Archive</small></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-link" onClick={() => { setSettingsTab('Profile'); setSettingsOpen(true); }} aria-label="Settings"><span className="icon"><img src="/icons/settings.svg" alt="" /></span><small>Settings</small></button>
          <button className="user-mini" aria-label="Your profile" onClick={() => { setSettingsTab('Profile'); setSettingsOpen(true); }}>{initials(accountUser?.name)}</button>
        </div>
      </nav>

      <aside className="inbox" aria-label="Conversation list">
        <header className="inbox-head">
          <div className="head-row">
            <div><span className="eyebrow">YOUR NOOK</span><h1>Messages</h1></div>
            <button className="icon-button compose" onClick={() => setDialogOpen(true)} aria-label="New conversation"><img className="ui-icon" src="/icons/plus.svg" alt="" /></button>
          </div>
          <label className="search">
            <span aria-hidden="true"><img className="ui-icon" src="/icons/search.svg" alt="" /></span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" />
          </label>
          <div className="filter-row" role="tablist" aria-label="Conversation filter">
            {[['all', 'All'], ['unread', 'Unread'], ['groups', 'Groups']].map(([key, label]) => (
              <button key={key} className={`filter ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)} role="tab" aria-selected={filter === key}>
                {label}{key === 'all' && <span>{mapped.length}</span>}
              </button>
            ))}
          </div>
        </header>
        <div className="section-label"><span>RECENT</span></div>
        <div className="conversation-list">
          {visibleConversations.length ? visibleConversations.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} selected={conversation.id === active?.id} onSelect={() => selectConversation(conversation.id)} />
          )) : (
            <div className="empty-list">
              <span><img className="ui-icon" src="/icons/search.svg" alt="" /></span>
              <strong>{mapped.length ? 'No conversations found' : 'No conversations yet'}</strong>
              <small>{mapped.length ? 'Try another name or start a new chat.' : 'Search for a person to start your first chat.'}</small>
            </div>
          )}
        </div>
        <footer className="inbox-footer"><span className="sync-dot" /><span>All caught up</span></footer>
      </aside>

      <section className="chat" aria-label="Conversation">
        {active ? (
          <>
            <header className="chat-head">
              <button className="back-button" onClick={backToInbox} aria-label="Back to conversations"><img className="ui-icon" src="/icons/back.svg" alt="" /></button>
              <Avatar initials={active.initials} color={active.color} online={active.online} size="avatar-lg" src={active.avatar} />
              <div className="chat-person">
                <h2>{active.name}</h2>
                <p>{active.online && <span className="status-dot" />}{typingName && active.id === activeId ? `${typingName} is typing…` : active.status}</p>
              </div>
              <div className="chat-actions">
                <button className="icon-button" onClick={() => showToast('Calls need a connected account.')} aria-label="Start call"><img className="ui-icon" src="/icons/call.svg" alt="" /></button>
                <button className="icon-button" onClick={() => setDetailsOpen((open) => !open)} aria-label="Conversation details"><img className="ui-icon" src="/icons/info.svg" alt="" /></button>
              </div>
            </header>
            <div className="chat-body" aria-live="polite">
              <div className="message-stack">{(active.messages || []).map((item) => <Message key={item.id} message={item} group={active.group} />)}</div>
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input ref={imageInput} className="hidden-file-input" type="file" accept="image/*" multiple onChange={(event) => addAttachments(event, 'image')} />
              <input ref={videoInput} className="hidden-file-input" type="file" accept="video/*" multiple onChange={(event) => addAttachments(event, 'video')} />
              <input ref={audioInput} className="hidden-file-input" type="file" accept="audio/*" multiple onChange={(event) => addAttachments(event, 'audio')} />
              <input ref={fileInput} className="hidden-file-input" type="file" multiple onChange={(event) => addAttachments(event, 'file')} />
              {attachments.length > 0 && <div className="attachment-tray" aria-label="Attachments to send">{attachments.map((file, index) => <AttachmentPreview key={`${file.name}-${index}`} file={file} removable onRemove={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
              <div className="composer-box">
                <div className="attach-menu-wrap">
                  <button type="button" className="composer-tool attach" onClick={() => setAttachMenuOpen((open) => !open)} aria-label="Attach media or file" aria-expanded={attachMenuOpen}><img className="ui-icon" src="/icons/plus.svg" alt="" /></button>
                  {attachMenuOpen && (
                    <div className="attach-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); imageInput.current?.click(); }}><img src="/icons/picture.svg" alt="" /> Picture</button>
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); videoInput.current?.click(); }}><img src="/icons/video.svg" alt="" /> Video</button>
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); audioInput.current?.click(); }}><img src="/icons/music.svg" alt="" /> Music</button>
                      <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); fileInput.current?.click(); }}><img src="/icons/file.svg" alt="" /> File</button>
                    </div>
                  )}
                </div>
                <input
                  id="message-input"
                  type="text"
                  maxLength="2000"
                  placeholder={`Message ${active.group ? 'the group' : active.name.split(' ')[0]}…`}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    connectSocket().emit('typing', active.id);
                    window.clearTimeout(typingTimer.current);
                    typingTimer.current = window.setTimeout(() => connectSocket().emit('typing:stop', active.id), 1200);
                  }}
                  autoComplete="off"
                />
                <button type="submit" className="send-button" aria-label="Send message"><img className="ui-icon" src="/icons/send.svg" alt="" /></button>
              </div>
              <div className="composer-hint"><span>Press <kbd>Enter</kbd> to send</span><span className="encryption">♢ &nbsp;Your conversations are private</span></div>
            </form>
          </>
        ) : (
          <div className="chat-body"><div className="empty-list"><strong>Start a conversation</strong><small>Choose someone from People to begin.</small></div></div>
        )}
      </section>

      {active && (
        <aside className={`details ${detailsOpen ? 'details-open' : ''}`} aria-label="Conversation details">
          <header className="details-head">
            <h2>Details</h2>
            <button className="icon-button" onClick={() => setDetailsOpen(false)} aria-label="Close details"><img className="ui-icon" src="/icons/close.svg" alt="" /></button>
          </header>
          <div className="details-content">
            <div className="profile-card">
              <div className="profile-avatar-wrap"><Avatar initials={active.initials} color={active.color} size="avatar-xl" src={active.avatar} /><span className="online-indicator" /></div>
              <h3>{active.name}</h3>
              <p>{active.role}</p>
              <div className="quick-actions">
                <button onClick={() => { setMuted((value) => !value); showToast(muted ? 'Notifications restored' : 'Conversation muted'); }}><span><img className="ui-icon" src="/icons/mute.svg" alt="" /></span>{muted ? 'Unmute' : 'Mute'}</button>
              </div>
            </div>
            <div className="privacy-note">
              <span><img src="/icons/privacy.svg" alt="" /></span>
              <div><strong>Private by design</strong><p>Your messages are only visible to you and the people in this conversation.</p></div>
            </div>
          </div>
        </aside>
      )}

      <NewChatDialog open={dialogOpen} query={peopleSearch} setQuery={setPeopleSearch} people={people} onSelect={startConversation} onClose={() => setDialogOpen(false)} />
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );
}
