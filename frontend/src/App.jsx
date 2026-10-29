/** Nook Messenger React interface with a locally interactive conversation demo. */
import { useMemo, useRef, useState } from 'react';

const initialConversations = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', color: 'rose', status: 'Online now', online: true, role: 'Product designer', preview: 'The rooftop one is perfect.', time: '10:31', unread: 0, messages: [
    { from: 'them', text: 'Hey! I finally got the photos back from the weekend 📸', time: '10:24' },
    { from: 'me', text: 'Oh I’ve been waiting to see these! How did they turn out?', time: '10:26' },
    { from: 'them', text: 'So good! I’ll send you a few favorites. The light was unreal.', time: '10:28' },
    { from: 'them', text: 'Golden hour, good food, and finally a proper catch-up?', time: '10:31' },
    { from: 'me', text: 'The rooftop one is perfect.', time: '10:31', read: true }
  ] },
  { id: 'james', name: 'James Wilson', initials: 'JW', color: 'blue', status: 'Last seen 12 min ago', role: 'Photographer', preview: 'Sent you the new playlist 🎧', time: '9:42', unread: 2, messages: [
    { from: 'them', text: 'Sent you the new playlist 🎧', time: '9:42' },
    { from: 'them', text: 'Think you’ll love track 4', time: '9:42' }
  ] },
  { id: 'weekend', name: 'Weekend crew', initials: 'WC', color: 'green', status: '4 members · 2 online', role: 'Group conversation', preview: 'Aisha: Saturday works for me!', time: 'Yesterday', unread: 0, group: true, messages: [
    { from: 'them', sender: 'Aisha', text: 'Saturday works for me!', time: 'Yesterday' },
    { from: 'me', text: 'Perfect, let’s make a plan 🌿', time: 'Yesterday', read: true }
  ] },
  { id: 'aisha', name: 'Aisha Rahman', initials: 'AR', color: 'ochre', status: 'Online now', online: true, role: 'Illustrator', preview: 'Thank you! That means a lot 💛', time: 'Yesterday', unread: 0, messages: [
    { from: 'me', text: 'Your latest work is beautiful, Aisha!', time: 'Yesterday', read: true },
    { from: 'them', text: 'Thank you! That means a lot 💛', time: 'Yesterday' }
  ] },
  { id: 'design', name: 'Design friends', initials: 'DF', color: 'lilac', status: '6 members', role: 'Group conversation', preview: 'You: That’s such a good idea.', time: 'Tue', unread: 0, group: true, messages: [
    { from: 'them', sender: 'Noah', text: 'We should do a little creative meetup soon.', time: 'Tue' },
    { from: 'me', text: 'That’s such a good idea.', time: 'Tue', read: true }
  ] },
  { id: 'leo', name: 'Leo Martins', initials: 'LM', color: 'slate', status: 'Last seen yesterday', role: 'Creative director', preview: 'See you there! 👋', time: 'Mon', unread: 0, messages: [
    { from: 'them', text: 'See you there! 👋', time: 'Mon' }
  ] }
];

const people = [
  { name: 'Sofia Kim', email: 'sofia.kim@example.com', initials: 'SK', color: 'lilac' },
  { name: 'Noah Brooks', email: 'noah.brooks@example.com', initials: 'NB', color: 'green' },
  { name: 'Priya Patel', email: 'priya.patel@example.com', initials: 'PP', color: 'ochre' },
  { name: 'Ethan Cole', email: 'ethan.cole@example.com', initials: 'EC', color: 'blue' }
];

// Displays the reusable avatar and its optional live indicator.
function Avatar({ initials, color, online = false, size = '' }) {
  return <span className={`avatar ${color} ${size}`}>{initials}{online && <i />}</span>;
}

// Renders the inbox row for one conversation.
function ConversationRow({ conversation, selected, onSelect }) {
  return (
    <button className={`conversation ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <Avatar initials={conversation.initials} color={conversation.color} online={conversation.online} />
      <span className="conversation-copy">
        <span className="conversation-top"><strong>{conversation.name}</strong><time>{conversation.time}</time></span>
        <span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread > 0 && <b className="unread-count">{conversation.unread}</b>}</span>
      </span>
    </button>
  );
}

// Renders one message bubble and read receipt.
function Message({ message, group }) {
  return (
    <div className={`message-row ${message.from === 'me' ? 'outgoing' : ''}`}>
      {message.from === 'them' && group && <span className="sender-name">{message.sender || 'Member'}</span>}
      <div className="bubble">{message.text && <span>{message.text}</span>}{message.attachments?.map((file, index) => <AttachmentPreview key={`${file.name}-${index}`} file={file} />)}<div className="message-meta"><time>{message.time}</time>{message.from === 'me' && <span className={`checks ${message.read ? 'read' : ''}`} aria-label={message.read ? 'Seen' : 'Sent'}>{message.read ? '✓✓' : '✓'}</span>}</div></div>
    </div>
  );
}

function AttachmentPreview({ file, removable = false, onRemove }) {
  if (file.kind === 'image') return <div className="attachment-image-wrap">{file.url ? <img className="attachment-image" src={file.url} alt={file.name} /> : <span className="attachment-file-icon">▧</span>}{removable && <button type="button" className="attachment-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>×</button>}</div>;
  return <div className="attachment-file-card"><span className="attachment-file-icon">{file.kind === 'video' ? '▶' : file.kind === 'audio' ? '♫' : '▤'}</span><span><strong>{file.name}</strong><small>{file.kind === 'video' ? 'Video' : file.kind === 'audio' ? 'Audio' : 'File'} · {formatFileSize(file.size)}</small></span>{removable && <button type="button" className="attachment-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>×</button>}</div>;
}

function formatFileSize(size = 0) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// Renders an accessible dialog for creating a local sample conversation.
function NewChatDialog({ open, query, setQuery, onSelect, onClose }) {
  const matches = people.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase()));
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
        <div className="dialog-head"><div><span className="eyebrow">START SOMETHING</span><h2 id="new-chat-title">New conversation</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><img className="ui-icon" src="/icons/close.svg" alt="" /></button></div>
        <label className="search dialog-search"><span><img className="ui-icon" src="/icons/search.svg" alt="" /></span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone by name or email" /></label>
        <div className="people-results">{matches.length ? matches.map((person) => <button className="person-result" key={person.email} onClick={() => onSelect(person)}><Avatar initials={person.initials} color={person.color} /><span><strong>{person.name}</strong><small>{person.email}</small></span><span className="person-add"><img src="/icons/plus.svg" alt="" /></span></button>) : <div className="empty-list"><strong>No one found</strong><small>Try another name or email.</small></div>}</div>
        <p className="dialog-note">People you start a chat with will appear in your inbox.</p>
      </section>
    </div>
  );
}

function SettingToggle({ title, description, defaultChecked = false }) {
  const [enabled, setEnabled] = useState(defaultChecked);
  return <div className="setting-toggle"><span><strong>{title}</strong><small>{description}</small></span><button type="button" role="switch" aria-checked={enabled} aria-label={title} className={`switch ${enabled ? 'on' : ''}`} onClick={() => setEnabled((value) => !value)}><i /></button></div>;
}

function SettingsPage({ tab, setTab, onBack, showToast, toast }) {
  const [saved, setSaved] = useState(false);
  const sections = ['Profile', 'Appearance', 'Notifications', 'Privacy & security'];
  return <main className="settings-shell">
    <nav className="rail" aria-label="Main navigation"><a className="brand" href="#" aria-label="Nook home" onClick={(event) => { event.preventDefault(); onBack(); }}>n</a><div className="rail-links"><button className="rail-link" onClick={onBack} aria-label="Messages"><span className="icon"><img src="/icons/messages.svg" alt="" /></span><small>Messages</small></button><button className="rail-link" onClick={onBack} aria-label="People"><span className="icon"><img src="/icons/people.svg" alt="" /></span><small>People</small></button><button className="rail-link" aria-label="Saved"><span className="icon"><img src="/icons/saved.svg" alt="" /></span><small>Saved</small></button><button className="rail-link" aria-label="Archive"><span className="icon"><img src="/icons/archive.svg" alt="" /></span><small>Archive</small></button></div><div className="rail-bottom"><button className="rail-link active" aria-label="Settings"><span className="icon"><img src="/icons/settings.svg" alt="" /></span><small>Settings</small></button><button className="user-mini" aria-label="Your profile">AS</button></div></nav>
    <section className="settings-main"><header className="settings-topbar"><div><span className="eyebrow">YOUR NOOK</span><h1>Settings</h1></div><button className="settings-back" onClick={onBack}>‹ <span>Back to messages</span></button></header>
      <div className="settings-layout"><aside className="settings-nav" aria-label="Settings sections"><p>ACCOUNT</p>{sections.map((name, i) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><span><img className="settings-nav-icon" src={["/icons/profile.svg", "/icons/appearance.svg", "/icons/notification.svg", "/icons/privacy.svg"][i]} alt="" /></span>{name}</button>)}<div className="settings-help"><strong>Need a hand?</strong><small>We’re always happy to help.</small><button onClick={() => showToast('Support is not connected in this demo.')}>Contact support →</button></div></aside>
        <div className="settings-content">
          {tab === 'Profile' && <><div className="settings-heading"><div><h2>Profile</h2><p>Manage how you show up to your people.</p></div><button className="save-settings" onClick={() => { setSaved(true); showToast('Your settings have been saved.'); window.setTimeout(() => setSaved(false), 1800); }}>{saved ? 'Saved ✓' : 'Save changes'}</button></div><div className="settings-card"><div className="profile-edit"><span className="avatar avatar-xl rose">AS</span><div><strong>Your photo</strong><small>JPG or PNG, up to 5 MB.</small></div><button onClick={() => showToast('Photo upload is not connected in this demo.')}>Change photo</button></div><div className="settings-fields"><label>Display name<input type="text" defaultValue="Alex Smith" /></label><label>Email address<input type="email" defaultValue="alex.smith@example.com" /></label><label>About you<textarea defaultValue="Always up for a good conversation." rows="3" /></label></div></div><div className="settings-card"><div className="settings-card-title"><div><h3>Profile visibility</h3><p>Choose who can find and connect with you.</p></div></div><label className="select-setting">Who can find me?<select defaultValue="Everyone"><option>Everyone</option><option>People I know</option><option>Nobody</option></select></label></div></>}
          {tab === 'Appearance' && <><div className="settings-heading"><div><h2>Appearance</h2><p>Make Nook feel comfortable to use.</p></div></div><div className="settings-card"><div className="settings-card-title"><div><h3>Theme</h3><p>Choose how Nook looks on this device.</p></div></div><div className="theme-options">{[['Light','/icons/sun.svg'],['System','/icons/appearance.svg'],['Dark','/icons/moon.svg']].map(([name,icon]) => <button key={name} className={`theme-option ${name === 'Light' ? 'selected' : ''}`} onClick={() => name !== 'Light' && showToast(`${name} theme is coming soon.`)}><span><img src={icon} alt="" /></span><strong>{name}</strong>{name === 'Light' && <i>✓</i>}</button>)}</div></div><div className="settings-card"><div className="settings-card-title"><div><h3>Message density</h3><p>Adjust the spacing between messages.</p></div></div><label className="select-setting">Conversation spacing<select defaultValue="Comfortable"><option>Comfortable</option><option>Compact</option></select></label></div></>}
          {tab === 'Notifications' && <><div className="settings-heading"><div><h2>Notifications</h2><p>Choose what you’d like to hear about.</p></div></div><div className="settings-card settings-toggles"><SettingToggle title="Message notifications" description="Get notified when someone messages you." defaultChecked /><SettingToggle title="Group conversations" description="Get notified about activity in your groups." defaultChecked /><SettingToggle title="Email updates" description="Occasional news and product updates from Nook." /></div><div className="settings-card"><div className="settings-card-title"><div><h3>Quiet hours</h3><p>Pause notifications during your downtime.</p></div><SettingToggle title="Enable quiet hours" /></div><div className="quiet-times"><label>From<input type="time" defaultValue="22:00" /></label><label>Until<input type="time" defaultValue="08:00" /></label></div></div></>}
          {tab === 'Privacy & security' && <><div className="settings-heading"><div><h2>Privacy &amp; security</h2><p>Take care of your account and personal space.</p></div></div><div className="settings-card settings-toggles"><SettingToggle title="Read receipts" description="Let people know when you’ve read their messages." defaultChecked /><SettingToggle title="Online status" description="Show when you’re currently active on Nook." defaultChecked /><SettingToggle title="Link previews" description="Show a preview when a link is shared in chat." defaultChecked /></div><div className="settings-card security-row"><div><h3>Password</h3><p>Keep your account secure with a strong password.</p></div><button onClick={() => showToast('Password changes are not connected in this demo.')}>Change password</button></div><div className="settings-card security-row"><div><h3>Active sessions</h3><p>You’re signed in on this device.</p></div><span className="current-session"><i/> This device</span></div></>}
        </div>
      </div>
    </section><div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
  </main>;
}

// Provides the message inbox, active thread, details panel, and local demo actions.
export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [authPage, setAuthPage] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState('maya');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [toast, setToast] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Profile');
  const timer = useRef(null);
  const imageInput = useRef(null);
  const videoInput = useRef(null);
  const audioInput = useRef(null);
  const fileInput = useRef(null);
  const active = conversations.find((conversation) => conversation.id === activeId) || conversations[0];

  // Filters the inbox rows using the selected tab and search query.
  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    const matchesSearch = `${conversation.name} ${conversation.preview}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'unread' && conversation.unread > 0) || (filter === 'groups' && conversation.group);
    return matchesSearch && matchesFilter;
  }), [conversations, filter, search]);

  // Shows brief feedback for controls that need a connected account.
  function showToast(text) {
    setToast(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2500);
  }

  // Keeps the current demo inbox behind a polished sign-in screen.
  function signIn(event) {
    event.preventDefault();
    setSignedIn(true);
  }

  // Validates the local sign-up form before opening the sample inbox.
  function signUp(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('password') !== data.get('confirmPassword')) {
      showToast('Those passwords don’t match yet.');
      return;
    }
    setSignedIn(true);
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
            <label className="remember-row terms-row"><input type="checkbox" required /><span>I agree to the <button type="button" className="text-link" onClick={() => showToast('Terms will be available when accounts are connected.')}>Terms</button> and <button type="button" className="text-link" onClick={() => showToast('Privacy details will be available when accounts are connected.')}>Privacy Policy</button>.</span></label>
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
            <label htmlFor="login-email">Email address</label><input id="login-email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <div className="password-label"><label htmlFor="login-password">Password</label><button type="button" className="text-link" onClick={() => showToast('Password reset is not connected in this demo.')}>Forgot password?</button></div>
            <div className="password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required minLength="6" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            <label className="remember-row"><input type="checkbox" defaultChecked /><span>Keep me signed in</span></label>
            <button className="login-submit" type="submit">Sign in <span>→</span></button>
          </form>
          <div className="login-divider"><span>OR CONTINUE WITH</span></div>
          <button className="google-login" type="button" onClick={() => showToast('Google sign-in is not connected in this demo.')}><b>G</b> Continue with Google</button>
          <p className="signup-copy">New to Nook? <button className="text-link" onClick={() => setAuthPage('signup')}>Create an account</button></p>
          <p className="login-privacy"><span>♢</span> Your conversations stay private and secure.</p>
        </div>
        <div className="login-legal">© 2025 Nook <span>Privacy</span><span>Terms</span></div>
      </section>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );

  if (settingsOpen) return <SettingsPage tab={settingsTab} setTab={setSettingsTab} onBack={() => setSettingsOpen(false)} showToast={showToast} toast={toast} />;

  // Selects a conversation and clears its unread count.
  function selectConversation(id) {
    setActiveId(id);
    setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, unread: 0 } : conversation));
    document.body.classList.add('mobile-chat-open');
  }

  // Adds a locally displayed message to the active conversation.
  function sendMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text && !attachments.length) return;
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
    const files = attachments.map(({ file, ...metadata }) => metadata);
    const preview = files.length ? `You: ${files.length === 1 ? files[0].name : `${files.length} attachments`}${text ? ` · ${text}` : ''}` : `You: ${text}`;
    setConversations((current) => current.map((conversation) => conversation.id === activeId ? { ...conversation, preview, time, messages: [...conversation.messages, { from: 'me', text, attachments: files, time }] } : conversation));
    setMessage('');
    setAttachments([]);
  }

  function addAttachments(event, kind) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const mapped = selected.map((file) => ({ file, name: file.name, size: file.size, kind, url: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '' }));
    setAttachments((current) => [...current, ...mapped]);
    event.target.value = '';
  }

  // Opens an existing or new local sample conversation from the people dialog.
  function startConversation(person) {
    let conversation = conversations.find((item) => item.name === person.name);
    if (!conversation) {
      conversation = { id: `person-${Date.now()}`, ...person, status: 'New conversation', role: 'Nook member', preview: 'Say hello 👋', time: 'Now', unread: 0, messages: [{ from: 'them', text: 'You’re connected. Send a hello to start the conversation 👋', time: 'Now' }] };
      setConversations((current) => [conversation, ...current]);
    }
    setDialogOpen(false);
    setPeopleSearch('');
    selectConversation(conversation.id);
  }

  // Closes the mobile conversation and returns to the inbox.
  function backToInbox() {
    document.body.classList.remove('mobile-chat-open');
  }

  return (
    <main className="app-shell" aria-label="Nook Messenger">
      <nav className="rail" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="Nook home">n</a>
        <div className="rail-links"><button className="rail-link active" aria-label="Messages"><span className="icon"><img src="/icons/messages.svg" alt="" /></span><small>Messages</small></button><button className="rail-link" onClick={() => setDialogOpen(true)} aria-label="People"><span className="icon"><img src="/icons/people.svg" alt="" /></span><small>People</small></button><button className="rail-link" onClick={() => showToast('Saved messages will appear here.')} aria-label="Saved"><span className="icon"><img src="/icons/saved.svg" alt="" /></span><small>Saved</small></button><button className="rail-link" onClick={() => showToast('Archived conversations will appear here.')} aria-label="Archive"><span className="icon"><img src="/icons/archive.svg" alt="" /></span><small>Archive</small></button></div>
        <div className="rail-bottom"><button className="rail-link" onClick={() => { setSettingsTab('Profile'); setSettingsOpen(true); }} aria-label="Settings"><span className="icon"><img src="/icons/settings.svg" alt="" /></span><small>Settings</small></button><button className="user-mini" aria-label="Your profile" onClick={() => { setSettingsTab('Profile'); setSettingsOpen(true); }}>AS</button></div>
      </nav>

      <aside className="inbox" aria-label="Conversation list">
        <header className="inbox-head"><div className="head-row"><div><span className="eyebrow">YOUR NOOK</span><h1>Messages</h1></div><button className="icon-button compose" onClick={() => setDialogOpen(true)} aria-label="New conversation"><img className="ui-icon" src="/icons/plus.svg" alt="" /></button></div>
          <label className="search"><span aria-hidden="true"><img className="ui-icon" src="/icons/search.svg" alt="" /></span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" />{!search && <kbd>⌘ K</kbd>}</label>
          <div className="filter-row" role="tablist" aria-label="Conversation filter">{[['all', 'All'], ['unread', 'Unread'], ['groups', 'Groups']].map(([key, label]) => <button key={key} className={`filter ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)} role="tab" aria-selected={filter === key}>{label}{key === 'all' && <span>{conversations.length}</span>}</button>)}</div>
        </header>
        <div className="section-label"><span>RECENT</span><button onClick={() => showToast('Showing most recent conversations first')} aria-label="Sort conversations"><img className="ui-icon" src="/icons/sort.svg" alt="" /></button></div>
        <div className="conversation-list">{visibleConversations.length ? visibleConversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} selected={conversation.id === activeId} onSelect={() => selectConversation(conversation.id)} />) : <div className="empty-list"><span><img className="ui-icon" src="/icons/search.svg" alt="" /></span><strong>No conversations found</strong><small>Try another name or start a new chat.</small></div>}</div>
        <footer className="inbox-footer"><span className="sync-dot" /><span>All caught up</span><button onClick={() => showToast('You’re all caught up.')} aria-label="More options"><img className="ui-icon" src="/icons/more.svg" alt="" /></button></footer>
      </aside>

      <section className="chat" aria-label="Conversation">
        <header className="chat-head"><button className="back-button" onClick={backToInbox} aria-label="Back to conversations"><img className="ui-icon" src="/icons/back.svg" alt="" /></button><Avatar initials={active.initials} color={active.color} online={active.online} size="avatar-lg" /><div className="chat-person"><h2>{active.name}</h2><p>{active.online && <span className="status-dot" />}{active.status}</p></div><div className="chat-actions"><button className="icon-button" onClick={() => { document.querySelector('#message-input')?.focus(); showToast('Search messages in this conversation'); }} aria-label="Search in conversation"><img className="ui-icon" src="/icons/search.svg" alt="" /></button><button className="icon-button call-button" onClick={() => showToast('Calls need a connected account.')} aria-label="Start call"><img className="ui-icon" src="/icons/call.svg" alt="" /></button><button className="icon-button" onClick={() => setDetailsOpen((open) => !open)} aria-label="Conversation details"><img className="ui-icon" src="/icons/info.svg" alt="" /></button><button className="icon-button more-button" onClick={() => showToast('More conversation actions will appear here.')} aria-label="More options"><img className="ui-icon" src="/icons/more.svg" alt="" /></button></div></header>
        <div className="chat-body" aria-live="polite"><div className="date-divider"><span>Today</span></div><div className="message-stack">{active.messages.map((item, index) => <Message key={`${active.id}-${index}`} message={item} group={active.group} />)}</div></div>
        <form className="composer" onSubmit={sendMessage}>
          <input ref={imageInput} className="hidden-file-input" type="file" accept="image/*" multiple onChange={(event) => addAttachments(event, 'image')} />
          <input ref={videoInput} className="hidden-file-input" type="file" accept="video/*" multiple onChange={(event) => addAttachments(event, 'video')} />
          <input ref={audioInput} className="hidden-file-input" type="file" accept="audio/*" multiple onChange={(event) => addAttachments(event, 'audio')} />
          <input ref={fileInput} className="hidden-file-input" type="file" multiple onChange={(event) => addAttachments(event, 'file')} />
          {attachments.length > 0 && <div className="attachment-tray" aria-label="Attachments to send">{attachments.map((file, index) => <AttachmentPreview key={`${file.name}-${index}`} file={file} removable onRemove={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
          <div className="composer-box"><div className="attach-menu-wrap"><button type="button" className="composer-tool attach" onClick={() => setAttachMenuOpen((open) => !open)} aria-label="Attach media or file" aria-expanded={attachMenuOpen}><img className="ui-icon" src="/icons/plus.svg" alt="" /></button>{attachMenuOpen && <div className="attach-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); imageInput.current?.click(); }}><img src="/icons/picture.svg" alt="" /> Picture</button><button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); videoInput.current?.click(); }}><img src="/icons/video.svg" alt="" /> Video</button><button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); audioInput.current?.click(); }}><img src="/icons/music.svg" alt="" /> Music</button><button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); fileInput.current?.click(); }}><img src="/icons/file.svg" alt="" /> File</button></div>}</div><input id="message-input" type="text" maxLength="2000" placeholder={`Message ${active.group ? 'the group' : active.name.split(' ')[0]}…`} value={message} onChange={(event) => setMessage(event.target.value)} autoComplete="off" /><button type="button" className="composer-tool emoji" onClick={() => setMessage((value) => `${value} 😊`)} aria-label="Add a smile"><img className="ui-icon" src="/icons/emoji.svg" alt="" /></button><button type="button" className="composer-tool voice" onClick={() => showToast('Voice messages need a connected account.')} aria-label="Voice message"><img className="ui-icon" src="/icons/voice.svg" alt="" /></button><button type="submit" className="send-button" aria-label="Send message"><img className="ui-icon" src="/icons/send.svg" alt="" /></button></div><div className="composer-hint"><span>Press <kbd>Enter</kbd> to send</span><span className="encryption">♢ &nbsp;Your conversations are private</span></div></form>
      </section>

      <aside className={`details ${detailsOpen ? 'details-open' : ''}`} aria-label="Conversation details"><header className="details-head"><h2>Details</h2><button className="icon-button" onClick={() => setDetailsOpen(false)} aria-label="Close details"><img className="ui-icon" src="/icons/close.svg" alt="" /></button></header><div className="details-content"><div className="profile-card"><div className="profile-avatar-wrap"><Avatar initials={active.initials} color={active.color} size="avatar-xl" /><span className="online-indicator" /></div><h3>{active.name}</h3><p>{active.role}</p><div className="quick-actions"><button onClick={() => { setMuted((value) => !value); showToast(muted ? 'Notifications restored' : 'Conversation muted'); }}><span><img className="ui-icon" src="/icons/mute.svg" alt="" /></span>{muted ? 'Unmute' : 'Mute'}</button><button onClick={() => { setDetailsOpen(false); document.querySelector('#message-input')?.focus(); showToast('Search messages in this conversation'); }}><span><img className="ui-icon" src="/icons/search.svg" alt="" /></span>Search</button><button onClick={() => showToast('More conversation details will appear here.')}><span><img className="ui-icon" src="/icons/more.svg" alt="" /></span>More</button></div></div>
          <div className="details-links"><button onClick={() => showToast('Shared photos and files will appear here.')}><span className="detail-symbol"><img src="/icons/media.svg" alt="" /></span><span>Media &amp; files</span><span className="detail-count">12　›</span></button><button onClick={() => showToast('Starred messages will appear here.')}><span className="detail-symbol"><img src="/icons/saved.svg" alt="" /></span><span>Starred messages</span><span className="detail-count">›</span></button></div>
          <div className="shared-head"><h3>Recently shared</h3><button onClick={() => showToast('Shared photos and files will appear here.')}>View all</button></div><div className="media-grid"><button className="media-tile tile-one" aria-label="Shared photo" onClick={() => showToast('Shared photo preview')} /><button className="media-tile tile-two" aria-label="Shared photo" onClick={() => showToast('Shared photo preview')} /><button className="media-tile tile-three" aria-label="More shared media" onClick={() => showToast('12 shared items')}>+9</button></div>
          <div className="privacy-note"><span><img src="/icons/privacy.svg" alt="" /></span><div><strong>Private by design</strong><p>Your messages are only visible to you and the people in this conversation.</p></div></div>
        </div></aside>

      <NewChatDialog open={dialogOpen} query={peopleSearch} setQuery={setPeopleSearch} onSelect={startConversation} onClose={() => setDialogOpen(false)} />
      <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
    </main>
  );
}
