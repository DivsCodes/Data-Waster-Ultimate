import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  CircleDot,
  Clock3,
  Flame,
  Gamepad2,
  Gauge,
  LockKeyhole,
  Medal,
  MousePointer2,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { PageHeading } from '../components/ui/PageHeading';
import { StatusPill } from '../components/ui/StatusPill';
import {
  claimReward,
  getAchievements,
  getDailyMissions,
  getLevelProgress,
  readGameProfile,
  recordGameResult,
  writeGameProfile,
} from '../features/gamification/gamification';
import type { GameId, GameProfile } from '../features/gamification/gamification';
import { readSessions } from '../features/sessions/sessionStorage';
import { formatBytes } from '../features/downloader/format';

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const achievementIconMap = {
  radio: CircleDot,
  gamepad: Gamepad2,
  joystick: Target,
  mouse: MousePointer2,
  zap: Zap,
  database: Gauge,
  medal: Medal,
  flame: Flame,
  timer: Timer,
} as const;

export function ArcadePage() {
  const [profile, setProfile] = useState<GameProfile>(() => readGameProfile());
  const [sessions, setSessions] = useState(() => readSessions());
  const level = getLevelProgress(profile.totalXp);
  const missions = useMemo(() => getDailyMissions(sessions, profile), [sessions, profile]);
  const achievements = useMemo(() => getAchievements(sessions, profile), [sessions, profile]);
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const claimedCount = achievements.filter((item) => item.claimed).length;

  useEffect(() => {
    const refresh = () => {
      setProfile(readGameProfile());
      setSessions(readSessions());
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const onGameCompleted = useCallback((gameId: GameId, score: number, xpEarned: number, durationMs: number) => {
    setProfile((current) => {
      const next = recordGameResult(current, {
        id: makeId(),
        gameId,
        score,
        xpEarned,
        durationMs,
        playedAt: Date.now(),
      });
      writeGameProfile(next);
      return next;
    });
  }, []);

  const claimMission = (rewardKey: string, rewardXp: number) => {
    setProfile((current) => {
      const next = claimReward(current, rewardKey, rewardXp);
      writeGameProfile(next);
      return next;
    });
  };

  const claimAchievement = (id: string, rewardXp: number) => {
    setProfile((current) => {
      const next = claimReward(current, `achievement:${id}`, rewardXp);
      writeGameProfile(next);
      return next;
    });
  };

  const recentGames = profile.recentGames.slice(0, 5);

  return (
    <div className="page-stack arcade-page">
      <PageHeading
        eyebrow="WORKSPACE / GAME CENTER"
        title="Play. Earn. Level up."
        description="Take a break with quick arcade challenges, complete daily missions and earn XP for your local Data Waster profile."
        action={<StatusPill tone="success">PHASE 6 · ACTIVE</StatusPill>}
      />

      <section className="arcade-hero">
        <div className="arcade-hero__copy">
          <div className="arcade-hero__eyebrow"><Sparkles size={13} /> YOUR PLAYER PROFILE</div>
          <h2>Every round moves<br /><span>you forward.</span></h2>
          <p>Earn XP by playing games and completing missions. Unlock achievements as you use the downloader and explore the arcade.</p>
          <div className="arcade-hero__meta">
            <span><Gamepad2 size={13} /> {profile.gamesPlayed} rounds played</span>
            <span><Trophy size={13} /> {unlockedCount} / {achievements.length} achievements unlocked</span>
          </div>
        </div>
        <div className="arcade-level-card">
          <div className="arcade-level-card__top"><span>PLAYER LEVEL</span><span className="arcade-level-card__badge"><Star size={11} fill="currentColor" /> LVL {level.level}</span></div>
          <div className="arcade-level-card__xp"><strong>{profile.totalXp.toLocaleString()}</strong><span> TOTAL XP</span></div>
          <div className="arcade-xp-track"><span style={{ width: `${level.progressPercent}%` }} /></div>
          <div className="arcade-level-card__bottom"><span>{level.xpIntoLevel} / {level.xpForNextLevel} XP</span><span>{Math.ceil(level.xpForNextLevel - level.xpIntoLevel)} XP to level {level.level + 1}</span></div>
        </div>
        <div className="arcade-hero__grid" aria-hidden="true" />
      </section>

      <div className="arcade-stat-grid">
        <div className="metric-card"><div className="metric-card__icon metric-card__icon--green"><Zap size={16} /></div><div className="metric-card__label">TOTAL XP</div><div className="metric-card__value">{profile.totalXp.toLocaleString()}</div><div className="metric-card__detail">Earned on this device</div></div>
        <div className="metric-card"><div className="metric-card__icon metric-card__icon--blue"><Gamepad2 size={16} /></div><div className="metric-card__label">GAMES PLAYED</div><div className="metric-card__value">{profile.gamesPlayed}</div><div className="metric-card__detail">Across all arcade modes</div></div>
        <div className="metric-card"><div className="metric-card__icon metric-card__icon--violet"><Trophy size={16} /></div><div className="metric-card__label">UNLOCKED</div><div className="metric-card__value">{unlockedCount}</div><div className="metric-card__detail">{claimedCount} reward{claimedCount === 1 ? '' : 's'} claimed</div></div>
        <div className="metric-card"><div className="metric-card__icon metric-card__icon--amber"><Flame size={16} /></div><div className="metric-card__label">BEST CLICKER RUN</div><div className="metric-card__value">{profile.bestScores['data-clicker']}</div><div className="metric-card__detail">Clicks in one 20-second round</div></div>
      </div>

      <div className="arcade-section-heading">
        <div><p className="eyebrow">THE ARCADE</p><h2>Pick a game</h2></div>
        <span className="arcade-section-heading__meta">2 PLAYABLE MODES</span>
      </div>
      <div className="arcade-games-grid">
        <DataClickerGame onComplete={onGameCompleted} />
        <SignalSprintGame onComplete={onGameCompleted} />
      </div>

      <div className="arcade-content-grid">
        <section className="dashboard-panel arcade-missions-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">TODAY'S OBJECTIVES</p><h2>Daily missions</h2></div>
            <span className="arcade-panel-tag"><Target size={11} /> {missions.filter((mission) => mission.complete).length}/{missions.length} COMPLETE</span>
          </div>
          <p className="dashboard-panel__description">Missions refresh each local calendar day. Rewards can only be claimed once per mission per day.</p>
          <div className="arcade-mission-list">
            {missions.map((mission) => (
              <div className="arcade-mission" key={mission.id}>
                <div className={`arcade-mission__icon${mission.complete ? ' arcade-mission__icon--complete' : ''}`}>{mission.complete ? <Check size={16} /> : <Target size={16} />}</div>
                <div className="arcade-mission__main">
                  <div className="arcade-mission__title-row"><strong>{mission.title}</strong><span>+{mission.rewardXp} XP</span></div>
                  <p>{mission.description}</p>
                  <div className="arcade-mission__progress"><span style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }} /></div>
                  <small>{mission.id === 'transfer-25mb' ? `${formatBytes(mission.progress)} / 25 MB` : `${Math.floor(mission.progress)} / ${mission.target}`}</small>
                </div>
                <div className="arcade-mission__action">
                  {mission.claimed
                    ? <span className="arcade-claimed"><Check size={12} /> CLAIMED</span>
                    : <button className="button button--primary" type="button" disabled={!mission.complete} onClick={() => claimMission(mission.rewardKey, mission.rewardXp)}>Claim</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="arcade-note"><ShieldCheck size={14} /><span>Transfer missions count actual completed or stopped download records saved by Data Waster. Game progress is stored locally on this device.</span></div>
        </section>

        <section className="dashboard-panel arcade-achievements-panel">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">MILESTONES</p><h2>Achievement collection</h2></div>
            <span className="arcade-panel-tag"><Award size={11} /> {unlockedCount} UNLOCKED</span>
          </div>
          <p className="dashboard-panel__description">Achievements are earned from real session records and arcade results. Claim each reward once.</p>
          <div className="arcade-achievement-list">
            {achievements.map((achievement) => {
              const Icon = achievementIconMap[achievement.icon as keyof typeof achievementIconMap] ?? Medal;
              return (
                <div className={`arcade-achievement${achievement.unlocked ? ' arcade-achievement--unlocked' : ''}`} key={achievement.id}>
                  <div className="arcade-achievement__icon">{achievement.unlocked ? <Icon size={17} /> : <LockKeyhole size={15} />}</div>
                  <div className="arcade-achievement__copy">
                    <strong>{achievement.name}</strong><small>{achievement.description}</small>
                    {!achievement.unlocked && <div className="arcade-achievement__progress"><span style={{ width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%` }} /></div>}
                  </div>
                  <div className="arcade-achievement__reward">
                    {achievement.claimed
                      ? <span className="arcade-claimed"><Check size={11} /> CLAIMED</span>
                      : achievement.unlocked
                        ? <button className="arcade-claim-link" type="button" onClick={() => claimAchievement(achievement.id, achievement.rewardXp)}>+{achievement.rewardXp} XP <span>CLAIM</span></button>
                        : <span>+{achievement.rewardXp} XP</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="dashboard-panel arcade-history-panel">
        <div className="dashboard-panel__heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest arcade rounds</h2></div><span className="arcade-panel-tag"><Clock3 size={11} /> LAST 5</span></div>
        {recentGames.length === 0 ? (
          <div className="empty-state"><div className="empty-state__icon"><Gamepad2 size={18} /></div><strong>Your first round is waiting.</strong><p>Play Data Clicker or Signal Sprint to start building your player record.</p></div>
        ) : (
          <div className="arcade-history-list">
            {recentGames.map((game) => (
              <div className="arcade-history-row" key={game.id}>
                <span className="arcade-history-row__icon">{game.gameId === 'data-clicker' ? <MousePointer2 size={15} /> : <Zap size={15} />}</span>
                <span className="arcade-history-row__name"><strong>{game.gameId === 'data-clicker' ? 'Data Clicker' : 'Signal Sprint'}</strong><small>{new Date(game.playedAt).toLocaleString()}</small></span>
                <span className="arcade-history-row__score">{game.score} <small>PTS</small></span>
                <span className="arcade-history-row__xp">+{game.xpEarned} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="arcade-disclaimer"><ShieldCheck size={15} /><p><strong>Local player profile:</strong> XP, missions, achievements and scores are saved in this browser. They are not a global leaderboard and won't sync between devices. Later community features will require an account and backend.</p></div>
    </div>
  );
}

interface GameCardProps {
  onComplete: (gameId: GameId, score: number, xpEarned: number, durationMs: number) => void;
}

function DataClickerGame({ onComplete }: GameCardProps) {
  const [active, setActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [roundId, setRoundId] = useState(0);
  const [handledRoundId, setHandledRoundId] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (active && secondsLeft === 0) setActive(false);
  }, [active, secondsLeft]);

  useEffect(() => {
    if (active || secondsLeft !== 0 || roundId === 0 || handledRoundId === roundId) return;
    setHandledRoundId(roundId);
    setLastScore(score);
    const xpEarned = Math.min(40, 5 + Math.floor(score / 5));
    onComplete('data-clicker', score, xpEarned, 20_000);
  }, [active, handledRoundId, onComplete, roundId, score, secondsLeft]);

  const startRound = () => {
    setScore(0);
    setLastScore(null);
    setSecondsLeft(20);
    setRoundId((current) => current + 1);
    setActive(true);
  };

  return (
    <article className="arcade-game-card arcade-game-card--clicker">
      <div className="arcade-game-card__top"><span className="arcade-game-card__icon"><MousePointer2 size={19} /></span><span className="arcade-game-card__difficulty">QUICK REFLEX</span></div>
      <h3>Data Clicker</h3>
      <p>Tap the core as fast as you can for 20 seconds. Every click adds one point; higher scores earn more XP.</p>
      <div className="clicker-console">
        <div className="clicker-console__stats"><span><small>TIME LEFT</small><strong>{`00:${String(secondsLeft).padStart(2, '0')}`}</strong></span><span><small>ROUND SCORE</small><strong>{score.toLocaleString()}</strong></span></div>
        <button className={`clicker-core${active ? ' clicker-core--active' : ''}`} type="button" onClick={() => active && secondsLeft > 0 && setScore((current) => current + 1)} disabled={!active || secondsLeft === 0} aria-label="Click the data core to score points">
          <span className="clicker-core__ring" /><span className="clicker-core__ring clicker-core__ring--inner" /><Zap size={29} fill="currentColor" />
        </button>
        <div className="clicker-console__bottom">
          <span>{active ? 'KEEP TAPPING' : lastScore === null ? 'READY WHEN YOU ARE' : `LAST SCORE: ${lastScore}`}</span>
          {active ? <span className="clicker-live-dot">ROUND LIVE</span> : <button className="button button--primary" type="button" onClick={startRound}><Play size={12} fill="currentColor" /> {lastScore === null ? 'Start round' : 'Play again'}</button>}
        </div>
      </div>
      <div className="arcade-game-card__foot"><span><Timer size={12} /> 20 SECOND ROUND</span><span><Sparkles size={12} /> UP TO 40 XP</span></div>
    </article>
  );
}

function SignalSprintGame({ onComplete }: GameCardProps) {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'too-soon' | 'result'>('idle');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const readyAtRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const start = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setReactionMs(null);
    setLastScore(null);
    setLastXp(null);
    setState('waiting');
    const delay = 1400 + Math.floor(Math.random() * 2200);
    timeoutRef.current = window.setTimeout(() => {
      readyAtRef.current = Date.now();
      setState('ready');
    }, delay);
  };

  const handleSignal = () => {
    if (state === 'idle' || state === 'result' || state === 'too-soon') {
      start();
      return;
    }
    if (state === 'waiting') {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      setState('too-soon');
      return;
    }
    const elapsed = Math.max(1, Date.now() - readyAtRef.current);
    const score = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, elapsed - 150) / 6)));
    const xpEarned = score > 0 ? Math.min(15, 3 + Math.floor(score / 8)) : 0;
    setReactionMs(elapsed);
    setLastScore(score);
    setLastXp(xpEarned);
    setState('result');
    onComplete('signal-sprint', score, xpEarned, elapsed);
  };

  const buttonLabel = state === 'idle' ? 'Start reaction test'
    : state === 'waiting' ? 'Wait for green…'
      : state === 'ready' ? 'TAP NOW!'
        : state === 'too-soon' ? 'Too early — try again'
          : 'Run it again';

  return (
    <article className="arcade-game-card arcade-game-card--signal">
      <div className="arcade-game-card__top"><span className="arcade-game-card__icon"><Zap size={19} /></span><span className="arcade-game-card__difficulty">REACTION TEST</span></div>
      <h3>Signal Sprint</h3>
      <p>Wait for the signal to turn green, then tap immediately. Jumping the gun resets the round.</p>
      <div className={`signal-console signal-console--${state}`}>
        <div className="signal-console__status">
          <span className="signal-light"><i /><i /><i /></span>
          <strong>{state === 'waiting' ? 'WAIT FOR SIGNAL' : state === 'ready' ? 'GO GO GO!' : state === 'too-soon' ? 'FALSE START' : state === 'result' ? 'SIGNAL CAPTURED' : 'STANDBY'}</strong>
        </div>
        <button className="signal-console__button" type="button" onClick={handleSignal}>
          {state === 'ready' ? <Zap size={26} fill="currentColor" /> : state === 'waiting' ? <Clock3 size={25} /> : state === 'result' ? <Gauge size={25} /> : <Rocket size={25} />}
          <span>{buttonLabel}</span>
        </button>
        <div className="signal-console__result">
          {state === 'too-soon' && <span className="signal-error">You tapped before the signal. No score this round.</span>}
          {state === 'result' && <><strong>{reactionMs} ms</strong><span>{lastScore} points · +{lastXp} XP</span></>}
          {state === 'idle' && <span>Random delay · no guessing</span>}
          {state === 'waiting' && <span>Keep your finger ready…</span>}
        </div>
      </div>
      <div className="arcade-game-card__foot"><span><Gauge size={12} /> LOWER TIME = BETTER</span><span><Sparkles size={12} /> UP TO 15 XP</span></div>
    </article>
  );
}
