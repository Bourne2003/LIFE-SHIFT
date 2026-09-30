import type Phaser from 'phaser';

/**
 * Works around a Phaser 3.90 RESIZE-mode bug: on an orientation change Phaser calls refresh()
 * before re-reading the parent size, so the canvas keeps the old size, and because the new
 * parent size is recorded at the end of that refresh its polling never notices the mismatch.
 * Rotating a phone from portrait to landscape reproduces it. Watching the container directly
 * and refreshing whenever the game size drifts from it keeps the canvas correct.
 */
export function keepCanvasSizedToParent(game: Phaser.Game, parent: HTMLElement): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {};

  const observer = new ResizeObserver(() => {
    const scale = game.scale;
    const rect = parent.getBoundingClientRect();
    if (
      Math.floor(rect.width) !== scale.gameSize.width ||
      Math.floor(rect.height) !== scale.gameSize.height
    ) {
      scale.getParentBounds();
      scale.refresh();
    }
  });
  observer.observe(parent);
  return () => observer.disconnect();
}
