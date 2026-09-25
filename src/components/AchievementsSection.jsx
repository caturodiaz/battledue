export default function AchievementsSection({ achievements, unlockedIds }) {
  const unlocked = new Set(unlockedIds)
  const unlockedCount = achievements.filter((achievement) => unlocked.has(achievement.id)).length

  return (
    <section className="player-profile__achievements panel">
      <div className="achievements-heading">
        <div>
          <p className="eyebrow">LOGROS</p>
          <h2>Tu progreso</h2>
          <p>Desbloqueá logros jugando y descubrí todo lo que podés conseguir en BattleDue.</p>
        </div>
        <strong className="achievements-counter">{unlockedCount} / {achievements.length}</strong>
      </div>

      <div className="achievements-grid">
        {achievements.map((achievement) => {
          const isUnlocked = unlocked.has(achievement.id)
          return (
            <article key={achievement.id} className={`achievement-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}>
              <div className="achievement-icon" aria-hidden="true">{isUnlocked ? achievement.icon : '🔒'}</div>
              <div className="achievement-copy">
                <div className="achievement-title-row">
                  <h3>{achievement.name}</h3>
                  {isUnlocked && <span className="achievement-status">DESBLOQUEADO</span>}
                </div>
                <p>{achievement.description}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
