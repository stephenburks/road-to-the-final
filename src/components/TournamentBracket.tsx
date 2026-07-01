import { useMemo } from 'react'
import type { AppData } from '../types'
import { buildBracketModel } from '../../scripts/lib/bracketModel.js'
import { ID_TO_FLAG, ID_TO_NAME } from './ui/teamLookup'
import { formatDate } from '../utils'
import FlagIcon from './ui/FlagIcon'
import styles from './TournamentBracket.module.css'

type Side =
	| { teamId: string }
	| { candidates: string[] }
	| { tbd: true }

interface Slot {
	status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'PREDICTED' | 'TBD'
	source: 'actual' | 'predicted' | 'tbd'
	home: Side
	away: Side
	homeScore?: number
	awayScore?: number
	homeShootout?: number
	awayShootout?: number
	winnerId?: string
	date?: string
	venue?: string
}

interface Stage {
	key: string
	label: string
	slots: Slot[]
}

interface BracketModel {
	stages: Stage[]
}

interface Props {
	data: AppData
	selectedTeamId: string
	onTeamPeek?: (id: string) => void
}

function sideHasTeam(side: Side, teamId: string): boolean {
	if ('teamId' in side) return side.teamId === teamId
	if ('candidates' in side) return side.candidates.includes(teamId)
	return false
}

function slotInvolvesTeam(slot: Slot, teamId: string): boolean {
	return sideHasTeam(slot.home, teamId) || sideHasTeam(slot.away, teamId)
}

function SideCell({
	side,
	score,
	shootout,
	isWinner,
	isLoser,
	isSelected,
	onTeamPeek,
}: {
	side: Side
	score?: number
	shootout?: number
	isWinner?: boolean
	isLoser?: boolean
	isSelected?: boolean
	onTeamPeek?: (id: string) => void
}) {
	if ('tbd' in side) {
		return <div className={`${styles.side} ${styles.sideTbd}`}>TBD</div>
	}
	if ('candidates' in side) {
		const names = side.candidates.map(id => ID_TO_NAME[id] ?? id)
		return (
			<div className={`${styles.side} ${styles.sideCandidates}`} aria-label={`Possible: ${names.join(' or ')}`}>
				<div className={styles.candFlags} aria-hidden="true">
					{side.candidates.slice(0, 4).map(id => (
						<FlagIcon key={id} code={id} flag={ID_TO_FLAG[id] ?? '🏳️'} name={ID_TO_NAME[id] ?? id} size={16} />
					))}
				</div>
				<div className={styles.candNames}>{names.join(' or ')}</div>
			</div>
		)
	}
	const id = side.teamId
	const name = ID_TO_NAME[id] ?? id
	const flag = ID_TO_FLAG[id] ?? '🏳️'
	const cls = [
		styles.side,
		isWinner ? styles.sideWinner : '',
		isLoser ? styles.sideLoser : '',
		isSelected ? styles.sideSelected : '',
	].filter(Boolean).join(' ')
	const inner = (
		<>
			<FlagIcon code={id} flag={flag} name={name} size={20} />
			<span className={styles.sideName}>{name}</span>
			{typeof score === 'number' && <span className={styles.sideScore}>{score}</span>}
			{typeof shootout === 'number' && (
				<span className={styles.sidePens} title="Penalty shootout">{`(${shootout})`}</span>
			)}
		</>
	)
	return onTeamPeek ? (
		<button type="button" className={`${cls} ${styles.sideButton}`} onClick={() => onTeamPeek(id)}>
			{inner}
		</button>
	) : (
		<div className={cls}>{inner}</div>
	)
}

function SlotCard({ slot, selectedTeamId, onTeamPeek }: { slot: Slot; selectedTeamId: string; onTeamPeek?: (id: string) => void }) {
	const isSelected = slotInvolvesTeam(slot, selectedTeamId)
	const isLive = slot.status === 'IN_PROGRESS'
	const isFinished = slot.status === 'FINISHED'
	const homeWinner = isFinished && slot.winnerId && 'teamId' in slot.home && slot.home.teamId === slot.winnerId
	const awayWinner = isFinished && slot.winnerId && 'teamId' in slot.away && slot.away.teamId === slot.winnerId

	const cardClass = [
		styles.slot,
		isSelected ? styles.slotSelected : '',
		isLive ? styles.slotLive : '',
		isFinished ? styles.slotFinished : '',
		slot.source === 'predicted' ? styles.slotPredicted : '',
		slot.source === 'tbd' ? styles.slotTbd : '',
	].filter(Boolean).join(' ')

	return (
		<div className={cardClass}>
			{slot.date && (
				<div className={styles.slotMeta}>
					<span>{formatDate(slot.date)}</span>
					{isLive && <span className={styles.liveBadge}>LIVE</span>}
				</div>
			)}
			<SideCell
				side={slot.home}
				score={isFinished || isLive ? slot.homeScore : undefined}
				shootout={isFinished ? slot.homeShootout : undefined}
				isWinner={!!homeWinner}
				isLoser={isFinished && !!slot.winnerId && !homeWinner}
				isSelected={isSelected}
				onTeamPeek={onTeamPeek}
			/>
			<SideCell
				side={slot.away}
				score={isFinished || isLive ? slot.awayScore : undefined}
				shootout={isFinished ? slot.awayShootout : undefined}
				isWinner={!!awayWinner}
				isLoser={isFinished && !!slot.winnerId && !awayWinner}
				isSelected={isSelected}
				onTeamPeek={onTeamPeek}
			/>
		</div>
	)
}

export default function TournamentBracket({ data, selectedTeamId, onTeamPeek }: Props) {
	const model = useMemo<BracketModel>(
		() => buildBracketModel(data.actualBracket) as BracketModel,
		[data.actualBracket]
	)

	if (!data.actualBracket || model.stages.every(s => s.slots.every(slot => slot.source === 'tbd'))) {
		return (
			<section className="wrap section">
				<h1 className={styles.heading}>Tournament Bracket</h1>
				<p className={styles.emptyState}>
					The bracket will appear once the knockout stage begins.
				</p>
			</section>
		)
	}

	return (
		<section className="wrap section" aria-labelledby="bracket-heading">
			<h1 id="bracket-heading" className={styles.heading}>Tournament Bracket</h1>
			<p className={styles.subhead}>
				Knockout stage progression. Cells dimmed with multiple flags are predicted from the
				previous round{'’'}s pairing; confirmed matchups override predictions automatically
				as ESPN publishes them.
			</p>

			<div className={styles.bracketGrid} role="list" aria-label="Tournament bracket">
				{model.stages.map(stage => (
					<div key={stage.key} className={styles.stageCol} role="listitem">
						<h2 className={styles.stageLabel}>{stage.label}</h2>
						<div className={styles.stageSlots}>
							{stage.slots.map((slot, i) => (
								<SlotCard
									key={`${stage.key}-${i}`}
									slot={slot}
									selectedTeamId={selectedTeamId}
									onTeamPeek={onTeamPeek}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
