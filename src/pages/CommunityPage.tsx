import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  ArrowDownToLine,
  BadgeCheck,
  CalendarDays,
  Check,
  ClipboardCopy,
  Crown,
  Gamepad2,
  Globe2,
  LockKeyhole,
  Medal,
  Plus,
  ShieldCheck,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { getLevelProgress, readGameProfile } from '../features/gamification/gamification';
import { formatBytes } from '../features/downloader/format';
import { readSessions } from '../features/sessions/sessionStorage';
import {
  addChallenge,
  addContact,
  addTeam,
  exportCommunityProfile,
  readCommunityData,
  removeChallenge,
  removeContact,
  removeTeam,
  updateChallengeStatus,
  updateProfile,
  writeCommunityData,
} from '../features/community/community';
import type { ChallengeMetric, ChallengeStatus, CommunityData } from '../features/community/community';

type CommunityTab = 'overview' | 'profile' | 'contacts' | 'teams' | 'challenges' | 'leaderboard';

const tabs: { id: CommunityTab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'profile', label: 'My profile', icon: Crown },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'teams', label: 'Teams', icon: UsersRound },
  { id: 'challenges', label: 'Challenges', icon: Swords },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

function formatDate(timestamp: number): string {
  if (!timestamp) return 'Not yet';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(timestamp);
}

function createActivityItems(sessions: ReturnType<typeof readSessions>, games: ReturnType<typeof readGameProfile>) {
  const sessionItems = sessions.map((session) => ({
    id: `session-${session.id}`,
    timestamp: session.finishedAt || session.startedAt,
    title: `${session.status === 'completed' ? 'Completed' : session.status === 'error' ? 'Attempted' : 'Stopped'} a download session`,
    detail: `${formatBytes(session.transferredBytes)} transferred`,
    icon: Zap,
  }));
  const gameItems = games.recentGames.map((game) => ({
    id: `game-${game.id}`,
    timestamp: game.playedAt,
    title: `Played ${game.gameId === 'data-clicker' ? 'Data Clicker' : 'Signal Sprint'}`,
    detail: `${Math.round(game.score)} points · ${game.xpEarned} XP earned`,
    icon: Gamepad2,
  }));
  return [...sessionItems, ...gameItems].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);
}

function saveJsonFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CommunityPage() {
  const [data, setData] = useState<CommunityData>(readCommunityData);
  const [tab, setTab] = useState<CommunityTab>('overview');
  const [notice, setNotice] = useState('');
  const sessions = useMemo(() => readSessions(), []);
  const gameProfile = useMemo(() => readGameProfile(), []);
  const level = getLevelProgress(gameProfile.totalXp);
  const totalTransferred = sessions.reduce((sum, session) => sum + session.transferredBytes, 0);
  const activities = useMemo(() => createActivityItems(sessions, gameProfile), [sessions, gameProfile]);

  const [profileForm, setProfileForm] = useState(data.profile);
  const [contactName, setContactName] = useState('');
  const [contactHandle, setContactHandle] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeMetric, setChallengeMetric] = useState<ChallengeMetric>('xp');
  const [challengeTarget, setChallengeTarget] = useState('500');
  const [challengeDuration, setChallengeDuration] = useState('7');

  const persist = (next: CommunityData, message: string) => {
    setData(next);
    const saved = writeCommunityData(next);
    setNotice(saved ? message : 'Could not save in this browser. Check local storage permissions.');
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = updateProfile(data, profileForm);
    if (!next) {
      setNotice('Choose a handle with 3–20 letters, numbers or underscores.');
      return;
    }
    persist(next, 'Profile saved on this device.');
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = addContact(data, { displayName: contactName, handle: contactHandle, note: contactNote });
    if (!next) {
      setNotice('That handle is invalid, already saved, or belongs to your own profile.');
      return;
    }
    persist(next, 'Contact saved locally. No invitation was sent.');
    setContactName(''); setContactHandle(''); setContactNote('');
  };

  const submitTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = addTeam(data, { name: teamName, tag: teamTag, description: teamDescription });
    if (!next) {
      setNotice('Enter a team name that is not already in your local workspace.');
      return;
    }
    persist(next, 'Team workspace created locally.');
    setTeamName(''); setTeamTag(''); setTeamDescription('');
  };

  const submitChallenge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = addChallenge(data, {
      title: challengeTitle,
      metric: challengeMetric,
      target: Number(challengeTarget),
      durationDays: Number(challengeDuration),
    });
    if (!next) {
      setNotice('Enter a title and a positive numeric target for this challenge.');
      return;
    }
    persist(next, 'Challenge draft created locally. It has not been shared.');
    setChallengeTitle('');
  };

  const exportProfile = () => {
    saveJsonFile(`data-waster-profile-${data.profile.handle}.json`, exportCommunityProfile(data.profile));
    setNotice('Profile card exported as JSON. This is not a hosted public profile.');
  };

  const copyProfile = async () => {
    const text = `${data.profile.displayName} (@${data.profile.handle})\n${data.profile.bio}\nData Waster 4.0 · Level ${level.level} · ${gameProfile.totalXp} XP`;
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Profile summary copied.');
    } catch {
      setNotice('Clipboard access is unavailable here. Use Export profile instead.');
    }
  };

  return (
    <div className="page-stack">
      <PageHeading eyebrow="PHASE 9 · COMMUNITY" title="Find your people." description="Create your local profile, organize teams and draft challenges. Online social features are clearly separated from this offline workspace." action={<span className="community-status"><span /> LOCAL WORKSPACE</span>} />

      <section className="community-local-notice" role="note">
        <span className="community-local-notice__icon"><ShieldCheck size={18} /></span>
        <div>
          <strong>Local preview — no community server connected</strong>
          <p>Your profile, contacts, teams and challenge drafts are stored in this browser only. Friend invites, shared teams and a global leaderboard require a hosted backend and are not simulated here.</p>
        </div>
      </section>

      {notice && <div className="community-toast" role="status"><Check size={14} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

      <nav className="community-tabs" aria-label="Community sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} aria-pressed={tab === id}>
            <Icon size={15} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <section className="community-hero">
            <div className="community-hero__copy">
              <p className="community-eyebrow">YOUR COMMUNITY IDENTITY</p>
              <h2>Welcome, <span>{data.profile.displayName}</span>.</h2>
              <p>@{data.profile.handle} · {data.profile.visibility === 'public' ? 'Public profile preference' : 'Private profile preference'}</p>
              <div className="community-hero__actions">
                <button className="button button--primary" type="button" onClick={() => setTab('profile')}>Edit profile</button>
                <button className="button button--quiet" type="button" onClick={exportProfile}><ArrowDownToLine size={14} /> Export profile</button>
              </div>
            </div>
            <div className="community-hero__avatar"><UsersRound size={42} /><span>LVL {level.level}</span></div>
          </section>

          <div className="community-metrics">
            <article className="community-metric"><span>PLAYER LEVEL</span><strong>{level.level}</strong><small>{level.xpIntoLevel} / {level.xpForNextLevel} XP to next level</small></article>
            <article className="community-metric"><span>TOTAL XP</span><strong>{gameProfile.totalXp.toLocaleString()}</strong><small>Earned in this browser</small></article>
            <article className="community-metric"><span>ARCADE ROUNDS</span><strong>{gameProfile.gamesPlayed}</strong><small>Local game history</small></article>
            <article className="community-metric"><span>DATA TRANSFERRED</span><strong>{formatBytes(totalTransferred)}</strong><small>{sessions.length} saved sessions</small></article>
          </div>

          <div className="community-grid community-grid--overview">
            <section className="community-panel">
              <div className="community-panel__heading"><div><p className="community-eyebrow">YOUR SPACE</p><h2>Community setup</h2></div><Users size={17} /></div>
              <div className="community-setup-list">
                <button type="button" onClick={() => setTab('profile')}><span className="community-setup-icon"><Crown size={16} /></span><span><strong>Personal profile</strong><small>Set your display name and handle</small></span><BadgeCheck size={15} /></button>
                <button type="button" onClick={() => setTab('contacts')}><span className="community-setup-icon"><UserPlus size={16} /></span><span><strong>Saved contacts</strong><small>{data.contacts.length} local contact{data.contacts.length === 1 ? '' : 's'}</small></span><Plus size={15} /></button>
                <button type="button" onClick={() => setTab('teams')}><span className="community-setup-icon"><UsersRound size={16} /></span><span><strong>Team workspaces</strong><small>{data.teams.length} local team{data.teams.length === 1 ? '' : 's'}</small></span><Plus size={15} /></button>
                <button type="button" onClick={() => setTab('challenges')}><span className="community-setup-icon"><Swords size={16} /></span><span><strong>Challenge board</strong><small>{data.challenges.length} saved challenge{data.challenges.length === 1 ? '' : 's'}</small></span><Plus size={15} /></button>
              </div>
            </section>
            <section className="community-panel">
              <div className="community-panel__heading"><div><p className="community-eyebrow">RECENT HISTORY</p><h2>Activity feed</h2></div><Activity size={17} /></div>
              {activities.length ? <div className="community-activity-list">{activities.map((item) => { const Icon = item.icon; return <article key={item.id}><span><Icon size={15} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{formatDate(item.timestamp)}</time></article>; })}</div> : <div className="community-empty"><Activity size={22} /><strong>Your story starts here.</strong><p>Completed download sessions and arcade rounds will appear in this local activity feed.</p></div>}
            </section>
          </div>
        </>
      )}

      {tab === 'profile' && (
        <div className="community-grid">
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">IDENTITY SETTINGS</p><h2>Edit your profile</h2></div><Crown size={18} /></div>
            <form className="community-form" onSubmit={saveProfile}>
              <label>Display name<input value={profileForm.displayName} maxLength={40} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} required /></label>
              <label>Handle<input value={profileForm.handle} maxLength={20} onChange={(event) => setProfileForm((current) => ({ ...current, handle: event.target.value }))} required aria-describedby="community-handle-help" /><small id="community-handle-help">3–20 letters, numbers or underscores. An @ is optional.</small></label>
              <label>Bio<textarea value={profileForm.bio} maxLength={160} rows={3} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} /><small>{profileForm.bio.length}/160 characters</small></label>
              <label>Profile preference<select value={profileForm.visibility} onChange={(event) => setProfileForm((current) => ({ ...current, visibility: event.target.value as 'public' | 'private' }))}><option value="private">Private</option><option value="public">Public (preference only)</option></select><small>This setting is saved locally. It does not publish your profile online.</small></label>
              <button className="button button--primary" type="submit">Save profile</button>
            </form>
          </section>
          <section className="community-panel community-profile-preview">
            <div className="community-panel__heading"><div><p className="community-eyebrow">PROFILE CARD</p><h2>Preview</h2></div><BadgeCheck size={18} /></div>
            <div className="community-profile-card"><span className="community-profile-card__avatar"><Crown size={29} /></span><h3>{profileForm.displayName || 'Your name'}</h3><p>@{profileForm.handle || 'your_handle'}</p><blockquote>{profileForm.bio || 'Add a short bio to introduce yourself.'}</blockquote><div><span>LEVEL {level.level}</span><span>{gameProfile.totalXp.toLocaleString()} XP</span><span>{gameProfile.gamesPlayed} GAMES</span></div><small>{profileForm.visibility === 'public' ? 'PUBLIC PREFERENCE · NOT PUBLISHED' : 'PRIVATE PROFILE PREFERENCE'}</small></div>
            <div className="community-export-actions"><button className="button button--quiet" type="button" onClick={copyProfile}><ClipboardCopy size={14} /> Copy summary</button><button className="button button--quiet" type="button" onClick={exportProfile}><ArrowDownToLine size={14} /> Export JSON</button></div>
          </section>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="community-grid">
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">CONTACT BOOK</p><h2>Save a contact</h2></div><UserPlus size={18} /></div>
            <form className="community-form" onSubmit={submitContact}>
              <label>Display name<input value={contactName} maxLength={40} onChange={(event) => setContactName(event.target.value)} placeholder="Friend's name" /></label>
              <label>Handle<input value={contactHandle} maxLength={30} onChange={(event) => setContactHandle(event.target.value)} placeholder="@their_handle" required /></label>
              <label>Private note<input value={contactNote} maxLength={100} onChange={(event) => setContactNote(event.target.value)} placeholder="How you know them (optional)" /></label>
              <button className="button button--primary" type="submit"><Plus size={14} /> Save contact</button>
              <p className="community-form-note"><LockKeyhole size={13} /> Contacts are private to this browser. This does not send a friend request.</p>
            </form>
          </section>
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">YOUR ADDRESS BOOK</p><h2>Saved contacts <span className="community-count">{data.contacts.length}</span></h2></div><Users size={18} /></div>
            {data.contacts.length ? <div className="community-record-list">{data.contacts.map((contact) => <article key={contact.id}><span className="community-record-avatar">{contact.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{contact.displayName}</strong><small>@{contact.handle}{contact.note ? ` · ${contact.note}` : ''}</small></div><button type="button" className="community-icon-button" onClick={() => persist(removeContact(data, contact.id), 'Contact removed.')} aria-label={`Remove ${contact.displayName}`}><Trash2 size={15} /></button></article>)}</div> : <div className="community-empty"><UserPlus size={22} /><strong>No contacts saved yet.</strong><p>Add handles to your local address book. Sync and friend requests will need the future community server.</p></div>}
          </section>
        </div>
      )}

      {tab === 'teams' && (
        <div className="community-grid">
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">TEAM BUILDER</p><h2>Create a team space</h2></div><UsersRound size={18} /></div>
            <form className="community-form" onSubmit={submitTeam}>
              <label>Team name<input value={teamName} maxLength={40} onChange={(event) => setTeamName(event.target.value)} placeholder="Packet Crew" required /></label>
              <label>Short tag<input value={teamTag} maxLength={6} onChange={(event) => setTeamTag(event.target.value)} placeholder="PC" /></label>
              <label>Description<textarea value={teamDescription} maxLength={160} rows={3} onChange={(event) => setTeamDescription(event.target.value)} placeholder="What is this team about?" /></label>
              <button className="button button--primary" type="submit"><Plus size={14} /> Create team</button>
              <p className="community-form-note"><LockKeyhole size={13} /> Local team drafts only. Members and team chat are not synced.</p>
            </form>
          </section>
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">YOUR GROUPS</p><h2>Team spaces <span className="community-count">{data.teams.length}</span></h2></div><Users size={18} /></div>
            {data.teams.length ? <div className="community-record-list">{data.teams.map((team) => <article key={team.id}><span className="community-team-tag">{team.tag || 'DW'}</span><div><strong>{team.name}</strong><small>{team.description || 'No description'} · Created {formatDate(team.createdAt)}</small></div><button type="button" className="community-icon-button" onClick={() => persist(removeTeam(data, team.id), 'Team removed from this browser.')} aria-label={`Delete ${team.name}`}><Trash2 size={15} /></button></article>)}</div> : <div className="community-empty"><UsersRound size={22} /><strong>No teams yet.</strong><p>Create a private team workspace draft. Online membership, chat and team competition need a backend.</p></div>}
          </section>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="community-grid">
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">CHALLENGE DESIGNER</p><h2>Draft a competition</h2></div><Swords size={18} /></div>
            <form className="community-form" onSubmit={submitChallenge}>
              <label>Challenge title<input value={challengeTitle} maxLength={60} onChange={(event) => setChallengeTitle(event.target.value)} placeholder="Weekend XP sprint" required /></label>
              <label>Scoring metric<select value={challengeMetric} onChange={(event) => setChallengeMetric(event.target.value as ChallengeMetric)}><option value="xp">Earn XP</option><option value="games">Play arcade games</option><option value="downloads">Complete download sessions</option></select></label>
              <div className="community-form-row"><label>Target<input type="number" min="1" max="1000000000" value={challengeTarget} onChange={(event) => setChallengeTarget(event.target.value)} required /></label><label>Duration (days)<input type="number" min="1" max="90" value={challengeDuration} onChange={(event) => setChallengeDuration(event.target.value)} required /></label></div>
              <button className="button button--primary" type="submit"><Plus size={14} /> Save challenge draft</button>
              <p className="community-form-note"><CalendarDays size={13} /> Drafts are not announced, scheduled or sent to other users.</p>
            </form>
          </section>
          <section className="community-panel">
            <div className="community-panel__heading"><div><p className="community-eyebrow">COMPETITION BOARD</p><h2>Your challenges <span className="community-count">{data.challenges.length}</span></h2></div><Trophy size={18} /></div>
            {data.challenges.length ? <div className="community-challenge-list">{data.challenges.map((challenge) => <article key={challenge.id}><div className="community-challenge-list__top"><span className="community-challenge-icon"><Trophy size={16} /></span><span className={`community-challenge-status community-challenge-status--${challenge.status}`}>{challenge.status}</span></div><h3>{challenge.title}</h3><p>Target: {challenge.target.toLocaleString()} {challenge.metric === 'xp' ? 'XP' : challenge.metric === 'games' ? 'games' : 'sessions'} · {challenge.durationDays} days</p><div className="community-challenge-actions"><select value={challenge.status} onChange={(event) => persist(updateChallengeStatus(data, challenge.id, event.target.value as ChallengeStatus), 'Challenge status updated locally.')} aria-label={`Status for ${challenge.title}`}><option value="draft">Draft</option><option value="active">Active (local)</option><option value="complete">Complete</option></select><button type="button" className="community-icon-button" onClick={() => persist(removeChallenge(data, challenge.id), 'Challenge removed.')} aria-label={`Delete ${challenge.title}`}><Trash2 size={15} /></button></div></article>)}</div> : <div className="community-empty"><Swords size={22} /><strong>Your first challenge awaits.</strong><p>Create a challenge or competition draft. Live matchmaking and shared results will be enabled by a hosted service later.</p></div>}
          </section>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="community-grid">
          <section className="community-panel community-personal-rank">
            <div className="community-panel__heading"><div><p className="community-eyebrow">YOUR PERSONAL RECORD</p><h2>Local standings</h2></div><Medal size={18} /></div>
            <div className="community-rank-card"><span className="community-rank-avatar"><Crown size={25} /></span><div><strong>{data.profile.displayName}</strong><small>@{data.profile.handle}</small></div><b>LEVEL {level.level}</b></div>
            <div className="community-rank-metrics"><div><span>TOTAL XP</span><strong>{gameProfile.totalXp.toLocaleString()}</strong></div><div><span>GAMES PLAYED</span><strong>{gameProfile.gamesPlayed}</strong></div><div><span>DOWNLOAD SESSIONS</span><strong>{sessions.length}</strong></div></div>
            <p className="community-form-note"><ShieldCheck size={13} /> These figures come from this browser only and have not been submitted to a leaderboard.</p>
          </section>
          <section className="community-panel community-global-lock">
            <span className="community-global-lock__icon"><Globe2 size={25} /></span>
            <p className="community-eyebrow">GLOBAL COMPETITION</p>
            <h2>Real rankings need a shared server.</h2>
            <p>There is no live global leaderboard in this static-hosted build. We won't display fabricated players, scores or online status.</p>
            <ul><li>Verified accounts and secure sign-in</li><li>Server-validated XP and session records</li><li>Abuse protection and public profile controls</li><li>Realtime rankings and competition updates</li></ul>
            <span className="community-backend-badge"><LockKeyhole size={13} /> BACKEND NOT CONFIGURED</span>
          </section>
        </div>
      )}

      <div className="community-footer-note"><ShieldCheck size={14} /><span>Your community workspace is local-first. Clearing this browser's site data can remove these records. Never store passwords or private credentials in this workspace.</span></div>
    </div>
  );
}
