import { Keypad, Button } from '../types/core';

export interface Change {
  type: 'added' | 'removed' | 'modified';
  path: string[];
  oldValue?: any;
  newValue?: any;
  description: string;
}

export function calculateDiff(original: Keypad, current: Keypad): Change[] {
  const changes: Change[] = [];

  if (original.buttons.length !== current.buttons.length) {
    changes.push({
      type: 'modified',
      path: ['keypad', original.id, 'buttons', 'length'],
      oldValue: original.buttons.length,
      newValue: current.buttons.length,
      description: `Button count changed from ${original.buttons.length} to ${current.buttons.length}`,
    });
  }

  for (let i = 0; i < Math.max(original.buttons.length, current.buttons.length); i++) {
    const originalButton = original.buttons[i];
    const currentButton = current.buttons[i];

    if (!originalButton && currentButton) {
      changes.push({
        type: 'added',
        path: ['keypad', original.id, 'buttons', i.toString()],
        newValue: currentButton,
        description: `Button ${i + 1} added: "${currentButton.engraving.label}"`,
      });
      continue;
    }

    if (originalButton && !currentButton) {
      changes.push({
        type: 'removed',
        path: ['keypad', original.id, 'buttons', i.toString()],
        oldValue: originalButton,
        description: `Button ${i + 1} removed: "${originalButton.engraving.label}"`,
      });
      continue;
    }

    if (originalButton && currentButton) {
      const buttonChanges = compareButtons(originalButton, currentButton, original.id);
      changes.push(...buttonChanges);
    }
  }

  return changes;
}

function compareButtons(original: Button, current: Button, keypadId: string): Change[] {
  const changes: Change[] = [];

  if (original.engraving.label !== current.engraving.label) {
    changes.push({
      type: 'modified',
      path: ['keypad', keypadId, 'button', original.id, 'label'],
      oldValue: original.engraving.label,
      newValue: current.engraving.label,
      description: `Button ${original.position}: Label changed from "${original.engraving.label}" to "${current.engraving.label}"`,
    });
  }

  if (original.logic.ledLogic.type !== current.logic.ledLogic.type) {
    changes.push({
      type: 'modified',
      path: ['keypad', keypadId, 'button', original.id, 'ledLogic', 'type'],
      oldValue: original.logic.ledLogic.type,
      newValue: current.logic.ledLogic.type,
      description: `Button ${original.position}: LED Logic changed from "${original.logic.ledLogic.type}" to "${current.logic.ledLogic.type}"`,
    });
  }

  if (original.logic.ledLogic.sceneNumber !== current.logic.ledLogic.sceneNumber) {
    changes.push({
      type: 'modified',
      path: ['keypad', keypadId, 'button', original.id, 'ledLogic', 'sceneNumber'],
      oldValue: original.logic.ledLogic.sceneNumber,
      newValue: current.logic.ledLogic.sceneNumber,
      description: `Button ${original.position}: Scene number changed from ${original.logic.ledLogic.sceneNumber} to ${current.logic.ledLogic.sceneNumber}`,
    });
  }

  const actionTypes = ['press', 'release', 'doubleTap', 'hold'] as const;
  for (const actionType of actionTypes) {
    const originalActions = original.logic.actions[actionType] || [];
    const currentActions = current.logic.actions[actionType] || [];

    if (originalActions.length !== currentActions.length) {
      changes.push({
        type: 'modified',
        path: ['keypad', keypadId, 'button', original.id, 'actions', actionType],
        oldValue: originalActions.length,
        newValue: currentActions.length,
        description: `Button ${original.position}: ${actionType} actions changed (${originalActions.length} → ${currentActions.length})`,
      });
    }

    for (let i = 0; i < Math.max(originalActions.length, currentActions.length); i++) {
      const originalAction = originalActions[i];
      const currentAction = currentActions[i];

      if (!originalAction && currentAction) {
        changes.push({
          type: 'added',
          path: ['keypad', keypadId, 'button', original.id, 'actions', actionType, i.toString()],
          newValue: currentAction,
          description: `Button ${original.position}: Added ${actionType} action for "${currentAction.loadFullPath}" at ${currentAction.commandLevel}%`,
        });
      }

      if (originalAction && !currentAction) {
        changes.push({
          type: 'removed',
          path: ['keypad', keypadId, 'button', original.id, 'actions', actionType, i.toString()],
          oldValue: originalAction,
          description: `Button ${original.position}: Removed ${actionType} action for "${originalAction.loadFullPath}"`,
        });
      }

      if (originalAction && currentAction) {
        if (
          originalAction.commandLevel !== currentAction.commandLevel ||
          originalAction.fadeTime !== currentAction.fadeTime ||
          originalAction.delay !== currentAction.delay
        ) {
          changes.push({
            type: 'modified',
            path: ['keypad', keypadId, 'button', original.id, 'actions', actionType, i.toString()],
            oldValue: originalAction,
            newValue: currentAction,
            description: `Button ${original.position}: Modified ${actionType} action for "${currentAction.loadFullPath}" (Level: ${originalAction.commandLevel}% → ${currentAction.commandLevel}%, Fade: ${originalAction.fadeTime}s → ${currentAction.fadeTime}s)`,
          });
        }
      }
    }
  }

  return changes;
}

export function calculateProjectDiff(originalKeypads: Keypad[], currentKeypads: Keypad[]): Change[] {
  const changes: Change[] = [];

  const originalMap = new Map(originalKeypads.map(k => [k.id, k]));
  const currentMap = new Map(currentKeypads.map(k => [k.id, k]));

  for (const [id, original] of originalMap) {
    const current = currentMap.get(id);
    if (current) {
      const keypadChanges = calculateDiff(original, current);
      changes.push(...keypadChanges);
    }
  }

  return changes;
}
