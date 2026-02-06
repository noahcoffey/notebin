import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

const initialState = {
  editorFontSize: 16,
  editorLineHeight: 1.6,
  showLineNumbers: false,
  vimMode: false,
  spellCheck: true,
  autoSave: true,
  autoSaveInterval: 5000,
  showRecentNotes: true,
};

function resetStore() {
  useSettingsStore.setState(initialState);
}

describe('settingsStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('default state', () => {
    it('has correct defaults', () => {
      const state = useSettingsStore.getState();
      expect(state.editorFontSize).toBe(16);
      expect(state.editorLineHeight).toBe(1.6);
      expect(state.showLineNumbers).toBe(false);
      expect(state.vimMode).toBe(false);
      expect(state.spellCheck).toBe(true);
      expect(state.autoSave).toBe(true);
      expect(state.autoSaveInterval).toBe(5000);
      expect(state.showRecentNotes).toBe(true);
    });
  });

  describe('setEditorFontSize', () => {
    it('sets font size within bounds', () => {
      useSettingsStore.getState().setEditorFontSize(20);
      expect(useSettingsStore.getState().editorFontSize).toBe(20);
    });

    it('clamps to minimum of 12', () => {
      useSettingsStore.getState().setEditorFontSize(8);
      expect(useSettingsStore.getState().editorFontSize).toBe(12);
    });

    it('clamps to maximum of 24', () => {
      useSettingsStore.getState().setEditorFontSize(30);
      expect(useSettingsStore.getState().editorFontSize).toBe(24);
    });
  });

  describe('setEditorLineHeight', () => {
    it('sets line height within bounds', () => {
      useSettingsStore.getState().setEditorLineHeight(1.8);
      expect(useSettingsStore.getState().editorLineHeight).toBe(1.8);
    });

    it('clamps to minimum of 1.2', () => {
      useSettingsStore.getState().setEditorLineHeight(0.5);
      expect(useSettingsStore.getState().editorLineHeight).toBe(1.2);
    });

    it('clamps to maximum of 2.4', () => {
      useSettingsStore.getState().setEditorLineHeight(3.0);
      expect(useSettingsStore.getState().editorLineHeight).toBe(2.4);
    });
  });

  describe('boolean toggles', () => {
    it('sets showLineNumbers', () => {
      useSettingsStore.getState().setShowLineNumbers(true);
      expect(useSettingsStore.getState().showLineNumbers).toBe(true);
    });

    it('sets vimMode', () => {
      useSettingsStore.getState().setVimMode(true);
      expect(useSettingsStore.getState().vimMode).toBe(true);
    });

    it('sets spellCheck', () => {
      useSettingsStore.getState().setSpellCheck(false);
      expect(useSettingsStore.getState().spellCheck).toBe(false);
    });

    it('sets autoSave', () => {
      useSettingsStore.getState().setAutoSave(false);
      expect(useSettingsStore.getState().autoSave).toBe(false);
    });

    it('sets showRecentNotes', () => {
      useSettingsStore.getState().setShowRecentNotes(false);
      expect(useSettingsStore.getState().showRecentNotes).toBe(false);
    });
  });

  describe('setAutoSaveInterval', () => {
    it('sets interval within bounds', () => {
      useSettingsStore.getState().setAutoSaveInterval(10000);
      expect(useSettingsStore.getState().autoSaveInterval).toBe(10000);
    });

    it('clamps to minimum of 1000', () => {
      useSettingsStore.getState().setAutoSaveInterval(100);
      expect(useSettingsStore.getState().autoSaveInterval).toBe(1000);
    });

    it('clamps to maximum of 60000', () => {
      useSettingsStore.getState().setAutoSaveInterval(100000);
      expect(useSettingsStore.getState().autoSaveInterval).toBe(60000);
    });
  });
});
