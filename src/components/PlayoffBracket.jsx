import React, { useState, useEffect } from 'react'
import { fetchEventMatches, fetchEventAlliances, fetchEventInfo } from '../utils/tbaApi'

// Round metadata — ordered from earliest to latest
const ROUNDS = [
  { level: 'ef', label: 'Eighth-Finals'  },
  { level: 'qf', label: 'Quarterfinals'  },
  { level: 'sf', label: 'Semifinals'     },
  { level: 'f',  label: 'Finals'         },
]

// -----------------------------------------------------------------------------
// matchLabel — human-readable label for a playoff match
//   "sf" set 1 match 2 → "SF1 M2"
// -----------------------------------------------------------------------------
function matchLabel(m) {
  const lvl = m.comp_level.toUpperCase()
  if (m.comp_level === 'f') return `Final M${m.match_number}`
  return `${lvl}${m.set_number} M${m.match_number}`
}

// -----------------------------------------------------------------------------
// AllianceRow — one alliance in a match card (red or blue)
// -----------------------------------------------------------------------------
function AllianceRow({ color, teams, score, won, teamKey }) {
  const isRed   = color === 'red'
  const bgClass = won
    ? isRed ? 'bracket-alliance bracket-red bracket-winner'
            : 'bracket-alliance bracket-blue bracket-winner'
    : isRed ? 'bracket-alliance bracket-red'
            : 'bracket-alliance bracket-blue'

  return (
    <div className={bgClass}>
      <div className="bracket-teams">
        {teams.map(t => {
          const num = t.replace('frc', '')
          const isUs = t === teamKey
          return (
            <span key={t} className={`bracket-team-num${isUs ? ' bracket-own' : ''}`}>
              {isUs ? '★' : ''}{num}
            </span>
          )
        })}
      </div>
      <span className="bracket-score">
        {score != null && score >= 0 ? score : '—'}
        {won && <span className="bracket-win-marker"> ✓</span>}
      </span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// MatchCard — one match in the bracket
// -----------------------------------------------------------------------------
function MatchCard({ match, teamKey }) {
  const red   = match.alliances?.red
  const blue  = match.alliances?.blue
  const rScore = red?.score  ?? -1
  const bScore = blue?.score ?? -1
  const played = rScore >= 0 && bScore >= 0
  const winner = match.winning_alliance  // "red" | "blue" | "" (tie/unplayed)

  return (
    <div className="bracket-match">
      <div className="bracket-match-label">{matchLabel(match)}</div>
      <AllianceRow
        color="red"
        teams={red?.team_keys   ?? []}
        score={played ? rScore : null}
        won={winner === 'red'}
        teamKey={teamKey}
      />
      <AllianceRow
        color="blue"
        teams={blue?.team_keys  ?? []}
        score={played ? bScore : null}
        won={winner === 'blue'}
        teamKey={teamKey}
      />
    </div>
  )
}

export default function PlayoffBracket({ settings, onBack }) {
  const [matches,   setMatches]   = useState(null)
  const [alliances, setAlliances] = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { tbaKey, eventCode } = settings
    if (!tbaKey)    { setError('Enter your TBA API key in Settings first.'); setLoading(false); return }
    if (!eventCode) { setError('Enter an event code in Settings first.');    setLoading(false); return }

    setLoading(true)
    setError(null)
    try {
      const [allMatches, allianceData, info] = await Promise.all([
        fetchEventMatches(eventCode, tbaKey),
        fetchEventAlliances(eventCode, tbaKey).catch(() => null),
        fetchEventInfo(eventCode, tbaKey).catch(() => null),
      ])
      // Keep only playoff matches (non-qual), sorted by time
      const playoffs = allMatches
        .filter(m => m.comp_level !== 'qm')
        .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))

      setMatches(playoffs)
      setAlliances(allianceData)
      setEventInfo(info)
    } catch (e) {
      setError(`Failed to load bracket.\n\n${e.message}`)
    }
    setLoading(false)
  }

  const teamKey = `frc${settings.teamNumber}`

  // Group matches by comp_level
  const grouped = {}
  if (matches) {
    for (const m of matches) {
      if (!grouped[m.comp_level]) grouped[m.comp_level] = []
      grouped[m.comp_level].push(m)
    }
  }

  // Determine the active rounds (levels that have at least one match)
  const activeRounds = ROUNDS.filter(r => grouped[r.level]?.length > 0)

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">
          🏅 {eventInfo?.name ?? settings.eventCode ?? 'Playoff Bracket'}
        </span>
        <button className="icon-btn" onClick={load} disabled={loading} title="Refresh">🔄</button>
      </div>

      <div className="view-body">

        {loading && (
          <div className="schedule-loading">
            <div className="schedule-spinner" />
            Loading bracket…
          </div>
        )}

        {!loading && error && (
          <div className="schedule-error">
            <div className="schedule-error-msg">{error}</div>
            <button className="schedule-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && matches && (
          <>
            {/* Alliance list (if available) */}
            {alliances?.length > 0 && (
              <div className="bracket-alliances">
                <div className="bracket-section-title">Alliances</div>
                <div className="bracket-alliance-list">
                  {alliances.map((a, i) => {
                    const lvl    = a.status?.level ?? null
                    const result = a.status?.status ?? null
                    return (
                      <div
                        key={i}
                        className={`bracket-alliance-card${a.picks?.includes(teamKey) ? ' bracket-alliance-us' : ''}`}
                      >
                        <span className="bracket-alliance-num">A{i + 1}</span>
                        <span className="bracket-alliance-teams">
                          {(a.picks ?? []).map(t => t.replace('frc', '')).join(' · ')}
                        </span>
                        {result && (
                          <span className={`bracket-alliance-status bracket-status-${result}`}>
                            {result === 'won'      ? '🏆'
                             : result === 'playing' ? '▶'
                             : result === 'eliminated' ? '✕'
                             : result}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bracket rounds */}
            {activeRounds.length === 0 ? (
              <div className="schedule-empty">Playoffs haven't started yet.</div>
            ) : (
              activeRounds.map(round => (
                <div key={round.level} className="bracket-round">
                  <div className="bracket-section-title">{round.label}</div>
                  {grouped[round.level].map(m => (
                    <MatchCard key={m.key} match={m} teamKey={teamKey} />
                  ))}
                </div>
              ))
            )}

            <div className="schedule-footer">Data from The Blue Alliance · ★ = your team</div>
          </>
        )}
      </div>
    </div>
  )
}
