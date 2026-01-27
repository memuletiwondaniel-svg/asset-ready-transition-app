import { useState, useCallback, useEffect } from 'react';

export interface UndoAction {
  type: 'vcr_move' | 'vcr_create' | 'vcr_delete' | 'system_assign' | 'system_unassign' | 'phase_reorder';
  description: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
}

const MAX_UNDO_STACK = 20;

export const useUndoStack = () => {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  const pushAction = useCallback((action: UndoAction) => {
    setUndoStack((prev) => {
      const newStack = [...prev, action];
      // Keep only the last MAX_UNDO_STACK actions
      if (newStack.length > MAX_UNDO_STACK) {
        return newStack.slice(-MAX_UNDO_STACK);
      }
      return newStack;
    });
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isUndoing) return false;

    setIsUndoing(true);
    const lastAction = undoStack[undoStack.length - 1];

    try {
      await lastAction.undo();
      setUndoStack((prev) => prev.slice(0, -1));
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing]);

  const clearStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  const canUndo = undoStack.length > 0 && !isUndoing;
  const lastActionDescription = undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null;

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return {
    pushAction,
    undo,
    clearStack,
    canUndo,
    isUndoing,
    lastActionDescription,
    stackSize: undoStack.length,
  };
};
