# BattleDue — handoff para continuar la migración del Battle Engine

Repositorio: `caturodiaz/battledue`  
Rama: `refactor/battle-engine`

## Objetivo

Completar la migración del combate a una única fuente de verdad: el Battle Engine. La UI y la IA deben elegir acciones y representar resultados; no deben calcular ni aplicar reglas de combate por su cuenta.

No hacer limpieza cosmética. Cada cambio debe eliminar duplicación, mover una regla al engine, unificar jugador/IA/online, corregir una regla o habilitar/mejorar gameplay verificable.

## Trabajo ya realizado en esta rama

### Commit `9750000` — `refactor: move ability effects into battle engine`

- Se eliminó `src/battle/ai/battleAbilityEffects.js`.
- La adaptación de efectos legacy (`statusEffect`, `battleEffect`, `status`) pasó a `src/battle/engine/abilityEffects.js`.
- `BattlePage` consume el adaptador desde el engine.
- La curación porcentual y la curación completa se calculan en `executeAbilityAction`; la UI presenta el valor `healing` devuelto por el engine.

### Commit `936717d` — `refactor: resolve combat attacks in battle engine`

- Se agregó `src/battle/engine/attackResolution.js`.
- El engine resuelve precisión, crítico, variación, evasión, furia, aturdimiento, inconsciente, defensa, consumo de defensa y energía.
- `BattlePage` dejó de contener `calculateAttack` y la reducción manual de defensa.
- Se agregaron tests deterministas para daño, defensa, evasión y energía.

### Commit `6265a76` — `refactor: define ability actions in battle engine`

- Se agregó `src/battle/engine/abilityDefinition.js`.
- `createAbilityAction` centraliza coste, multiplicador, crítico, impacto garantizado, si la acción causa daño y el efecto de estado.
- Soporta perfiles legacy y definiciones declarativas con `effects`, por ejemplo `damage_resolve` y `state_add`.
- `BattlePage` usa la definición del engine para costes, disponibilidad y ejecución de habilidades/definitivas.
- Una habilidad no ofensiva, como una curación total o buff declarativo, ya no inflige daño mínimo accidentalmente.

## Estado actual

- Tests del engine: `npm run test:battle-engine` → 20 archivos, todos pasan.
- Build: `npm run build` → pasa.
- Lint global: falla por errores preexistentes fuera de este trabajo. No corregirlos dentro de commits de Battle Engine salvo que se solicite explícitamente.
- `package-lock.json` estaba modificado antes de esta serie de commits. Está deliberadamente fuera de los commits anteriores; no sobrescribirlo ni incluirlo sin inspeccionarlo.

## Arquitectura actual relevante

```text
UI selecciona habilidad
        ↓
createAbilityAction (engine)
        ↓
resolveCombatAttack (engine)
        ↓
executeAbilityAction (engine)
        ↓
effects / events / triggers
        ↓
UI representa el resultado
```

Archivos principales:

- `src/battle/engine/abilityDefinition.js`: convierte una definición de habilidad en configuración ejecutable.
- `src/battle/engine/abilityEffects.js`: adapta efectos legacy a estados de combate.
- `src/battle/engine/attackResolution.js`: resuelve el resultado de ataque sin UI.
- `src/battle/engine/abilityAction.js`: aplica daño, energía, curación y un `battleEffect` al estado.
- `src/pages/BattlePage.jsx`: todavía conserva coordinación de estado React, turnos, logs y animaciones.

## Siguiente tarea concreta

Completar `executeAbilityAction` para que ejecute directamente una lista declarativa de efectos de habilidad, sin depender de un único `battleEffect` legacy.

Debe cubrir como mínimo:

1. `damage_resolve`.
2. `heal` y curación completa.
3. `resource_add` y coste de energía.
4. `state_add` con duración y stacks.
5. Target `self` y `enemy`/`target`.
6. Múltiples efectos en orden.
7. Que los efectos que requieren impacto no se apliquen en un miss.
8. Eventos y triggers existentes.

La API deseada debe permitir una ruta como:

```js
executeAbilityAction(state, sourceId, targetId, {
  ability: {
    id: 'violet-fang',
    costs: { energy: 40 },
    effects: [
      { type: 'damage_resolve', multiplier: 2.2 },
      { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 2 },
    ],
  },
  combatResult,
})
```

No asumir esta firma literalmente si el contrato existente sugiere una variante más pequeña; preservar compatibilidad con los callers legacy durante la transición.

## Pasos posteriores, en orden recomendado

1. Tests de habilidades declarativas: daño, cura, cura completa, energía, stacks, duración, self/enemy, miss y efectos múltiples.
2. Migrar el avance/decremento de turnos y estados a un resultado completo del engine. `BattlePage` aún mantiene fragmentos de estado React separados.
3. Auditar IA: debe decidir acción/objetivo, pero ejecutar exclusivamente mediante el engine. No debe calcular ni aplicar combate.
4. Eliminar legacy sólo tras buscar consumers, verificar reemplazo, ejecutar tests/build y hacer commit pequeño.
5. Diseñar la frontera online: `OnlineBattlePage` y su RPC/Supabase son una implementación distinta y deben usar el mismo modelo de reglas con autoridad del servidor.
6. Sólo después, mejorar eventos/triggers, gameplay, balance y feedback visual.

## Reglas de trabajo

- Inspeccionar consumidores antes de editar o eliminar código.
- Mantener commits pequeños y semánticos.
- No mezclar refactor, UI, balance y mecánicas nuevas en un mismo commit.
- No modificar Supabase ni datos de producción salvo que la tarea lo exija.
- Mantener la suite de tests; no eliminar tests por cambios de implementación.
- Ejecutar `npm run test:battle-engine` y `npm run build` antes de cada commit.
- El lint global tiene fallos preexistentes: reportarlos, no ocultarlos.

## Prompt para retomar

> Estamos en `caturodiaz/battledue`, rama `refactor/battle-engine`. Lee `PROMPT_BATTLE_ENGINE_HANDOFF.md` y continúa desde la sección “Siguiente tarea concreta”. Inspecciona primero los consumers de `executeAbilityAction`, `abilityDefinition.js`, `effects.js` y `resolveEffects.js`. Implementa una migración pequeña para que habilidades declarativas ejecuten múltiples efectos dentro del Battle Engine, conservando compatibilidad legacy. Agrega tests que cubran el nuevo comportamiento, ejecuta `npm run test:battle-engine` y `npm run build`, no incluyas el `package-lock.json` preexistente, y crea un commit semántico sólo si las verificaciones pasan.
