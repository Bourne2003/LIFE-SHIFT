import {
  isSolid,
  parseMap,
  type Condition,
  type DialogueDef,
  type Effect,
  type GameContent,
  type TileGrid,
  type TilePos,
} from '@life-shift/shared';

/**
 * Checks content for broken references and impossible setups that TypeScript cannot see in
 * JSON: unknown ids, unreachable dialogue nodes, NPCs standing inside walls, and so on.
 * Returns human-readable problems; an empty list means the content is valid.
 */
export function validateContent(content: GameContent): string[] {
  const errors: string[] = [];
  const err = (msg: string): void => {
    errors.push(msg);
  };

  let grid: TileGrid | undefined;
  try {
    grid = parseMap(content.map);
  } catch (e) {
    err((e as Error).message);
  }

  const npcIds = new Set(content.npcs.map((n) => n.id));
  const locationIds = new Set(content.map.locations.map((l) => l.id));
  const usedDialogues = new Set<string>();
  const checkDialogueRefs = (
    where: string,
    refs: readonly { dialogue: string; when?: readonly Condition[] }[],
  ) => {
    if (refs.length === 0) err(`${where}: has no dialogues`);
    refs.forEach((ref, i) => {
      usedDialogues.add(ref.dialogue);
      if (!content.dialogues[ref.dialogue]) err(`${where}: unknown dialogue '${ref.dialogue}'`);
      checkConditions(`${where} dialogues[${i}]`, ref.when);
    });
  };

  const checkTile = (where: string, tile: TilePos) => {
    if (grid && isSolid(grid, tile)) err(`${where}: tile ${tile.x},${tile.y} is blocked`);
  };

  const checkConditions = (where: string, conditions: readonly Condition[] | undefined) => {
    for (const c of conditions ?? []) checkCondition(where, c);
  };
  const checkCondition = (where: string, c: Condition): void => {
    if (c.type === 'not') return checkCondition(where, c.condition);
    if (c.type === 'memory') {
      if (!npcIds.has(c.npc)) err(`${where}: unknown npc '${c.npc}'`);
      if (c.quest && !content.quests[c.quest]) err(`${where}: unknown quest '${c.quest}'`);
      return;
    }
    if (c.type !== 'quest') return;
    const quest = content.quests[c.quest];
    if (!quest) return err(`${where}: unknown quest '${c.quest}'`);
    if (c.objective && !quest.objectives.some((o) => o.id === c.objective)) {
      err(`${where}: quest '${c.quest}' has no objective '${c.objective}'`);
    }
  };
  const checkEffects = (where: string, effects: readonly Effect[] | undefined) => {
    for (const e of effects ?? []) {
      if ((e.type === 'startQuest' || e.type === 'failQuest') && !content.quests[e.quest]) {
        err(`${where}: unknown quest '${e.quest}'`);
      }
      if (e.type === 'remember' && !npcIds.has(e.npc)) err(`${where}: unknown npc '${e.npc}'`);
    }
  };

  // --- Map --------------------------------------------------------------------------------
  checkTile(`map ${content.map.id} spawn`, content.map.spawn);
  findDuplicates(content.map.locations.map((l) => l.id)).forEach((id) =>
    err(`map: duplicate location '${id}'`),
  );
  if (grid) {
    for (const l of content.map.locations) {
      const { x, y, width, height } = l.area;
      if (
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        height <= 0 ||
        x + width > grid.width ||
        y + height > grid.height
      ) {
        err(`location ${l.id}: area is outside the map`);
      }
    }
  }

  // --- NPCs -------------------------------------------------------------------------------
  findDuplicates(content.npcs.map((n) => n.id)).forEach((id) => err(`duplicate npc '${id}'`));
  const occupied = new Map<string, string>();
  for (const npc of content.npcs) {
    const where = `npc ${npc.id}`;
    if (!/^#[0-9a-f]{6}$/i.test(npc.color)) err(`${where}: color must look like #rrggbb`);
    checkTile(`${where} position`, npc.position);
    const key = tileKey(npc.position);
    if (occupied.has(key)) err(`${where}: shares tile ${key} with ${occupied.get(key)}`);
    occupied.set(key, npc.id);
    npc.schedule.forEach((s, i) => {
      checkTile(`${where} schedule[${i}]`, s.position);
      checkConditions(`${where} schedule[${i}]`, s.when);
    });
    checkDialogueRefs(where, npc.dialogues);
    for (const other of Object.keys(npc.relationships)) {
      if (!npcIds.has(other)) err(`${where}: relationship with unknown npc '${other}'`);
    }
    for (const q of npc.quests) {
      if (!content.quests[q]) err(`${where}: unknown quest '${q}'`);
    }
  }

  // --- World objects ----------------------------------------------------------------------
  findDuplicates([...npcIds, ...content.objects.map((o) => o.id)]).forEach((id) =>
    err(`duplicate npc/object id '${id}'`),
  );
  const npcTiles = new Set(
    content.npcs.flatMap((n) => [n.position, ...n.schedule.map((s) => s.position)]).map(tileKey),
  );
  for (const object of content.objects) {
    const where = `object ${object.id}`;
    checkTile(`${where} position`, object.position);
    if (npcTiles.has(tileKey(object.position))) {
      err(`${where}: an npc can stand on its tile ${tileKey(object.position)}`);
    }
    if (object.appearances.length === 0) err(`${where}: has no appearances`);
    object.appearances.forEach((a, i) => {
      if (!a.texture) err(`${where} appearances[${i}]: texture is empty`);
      checkConditions(`${where} appearances[${i}]`, a.when);
    });
    checkDialogueRefs(where, object.dialogues);
  }

  // --- Dialogues --------------------------------------------------------------------------
  for (const [key, dialogue] of Object.entries(content.dialogues)) {
    const where = `dialogue ${key}`;
    if (dialogue.id !== key) err(`${where}: id '${dialogue.id}' does not match its key`);
    if (!usedDialogues.has(key)) err(`${where}: not used by any npc or object`);
    if (!dialogue.nodes[dialogue.start]) err(`${where}: start node '${dialogue.start}' missing`);

    for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
      const at = `${where}/${nodeId}`;
      if (node.speaker && node.speaker !== 'player' && !npcIds.has(node.speaker)) {
        err(`${at}: unknown speaker '${node.speaker}'`);
      }
      if (node.next && node.choices?.length) err(`${at}: has both next and choices`);
      if (node.next && !dialogue.nodes[node.next]) err(`${at}: next '${node.next}' missing`);
      checkEffects(at, node.effects);
      node.choices?.forEach((choice, i) => {
        if (choice.next && !dialogue.nodes[choice.next]) {
          err(`${at} choice ${i}: next '${choice.next}' missing`);
        }
        checkConditions(`${at} choice ${i}`, choice.when);
        checkEffects(`${at} choice ${i}`, choice.effects);
      });
    }
    for (const nodeId of unreachableNodes(dialogue)) err(`${where}/${nodeId}: unreachable`);
  }

  // --- Quests -----------------------------------------------------------------------------
  for (const [key, quest] of Object.entries(content.quests)) {
    const where = `quest ${key}`;
    if (quest.id !== key) err(`${where}: id '${quest.id}' does not match its key`);
    if (quest.giver && !npcIds.has(quest.giver)) err(`${where}: unknown giver '${quest.giver}'`);
    if (quest.objectives.length === 0) err(`${where}: has no objectives`);
    findDuplicates(quest.objectives.map((o) => o.id)).forEach((id) =>
      err(`${where}: duplicate objective '${id}'`),
    );
    for (const o of quest.objectives) {
      if (o.type === 'talk' && !npcIds.has(o.npc)) {
        err(`${where} objective ${o.id}: unknown npc '${o.npc}'`);
      }
      if (o.type === 'reach' && !locationIds.has(o.location)) {
        err(`${where} objective ${o.id}: unknown location '${o.location}'`);
      }
    }
    checkEffects(`${where} rewards`, quest.rewards);
    if (quest.next && !content.quests[quest.next]) {
      err(`${where}: unknown follow-up quest '${quest.next}'`);
    }
  }

  return errors;
}

function unreachableNodes(dialogue: DialogueDef): string[] {
  const seen = new Set<string>();
  const queue = [dialogue.start];
  while (queue.length > 0) {
    const id = queue.pop()!;
    const node = dialogue.nodes[id];
    if (seen.has(id) || !node) continue;
    seen.add(id);
    if (node.next) queue.push(node.next);
    for (const c of node.choices ?? []) if (c.next) queue.push(c.next);
  }
  return Object.keys(dialogue.nodes).filter((id) => !seen.has(id));
}

function tileKey(tile: TilePos): string {
  return `${tile.x},${tile.y}`;
}

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
}
