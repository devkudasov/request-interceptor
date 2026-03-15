import { describe, it, expect } from 'vitest';
import { MESSAGE_TYPES, STORAGE_KEYS, DEFAULT_STORAGE } from './constants';

describe('MESSAGE_TYPES', () => {
  describe('single-tab migration', () => {
    it('has SET_ACTIVE_TAB message type', () => {
      expect(MESSAGE_TYPES.SET_ACTIVE_TAB).toBe('SET_ACTIVE_TAB');
    });

    it('does NOT have TOGGLE_TAB message type', () => {
      expect(
        (MESSAGE_TYPES as Record<string, string>).TOGGLE_TAB,
      ).toBeUndefined();
    });

    it('does NOT have START_RECORDING message type', () => {
      expect(
        (MESSAGE_TYPES as Record<string, string>).START_RECORDING,
      ).toBeUndefined();
    });

    it('does NOT have STOP_RECORDING message type', () => {
      expect(
        (MESSAGE_TYPES as Record<string, string>).STOP_RECORDING,
      ).toBeUndefined();
    });

    it('does NOT have RECORDING_DATA message type', () => {
      expect(
        (MESSAGE_TYPES as Record<string, string>).RECORDING_DATA,
      ).toBeUndefined();
    });
  });

  describe('preserved message types', () => {
    it('still has GET_ACTIVE_TABS', () => {
      expect(MESSAGE_TYPES.GET_ACTIVE_TABS).toBeDefined();
    });

    it('still has TAB_STATUS_CHANGED', () => {
      expect(MESSAGE_TYPES.TAB_STATUS_CHANGED).toBeDefined();
    });

    it('still has rule-related message types', () => {
      expect(MESSAGE_TYPES.GET_RULES).toBeDefined();
      expect(MESSAGE_TYPES.CREATE_RULE).toBeDefined();
      expect(MESSAGE_TYPES.UPDATE_RULE).toBeDefined();
      expect(MESSAGE_TYPES.DELETE_RULE).toBeDefined();
    });
  });
});

describe('STORAGE_KEYS', () => {
  describe('single-tab migration', () => {
    it('has ACTIVE_TAB_ID key (singular, not plural)', () => {
      expect(STORAGE_KEYS.ACTIVE_TAB_ID).toBe('activeTabId');
    });

    it('does NOT have ACTIVE_TAB_IDS key (plural removed)', () => {
      expect(
        (STORAGE_KEYS as Record<string, string>).ACTIVE_TAB_IDS,
      ).toBeUndefined();
    });

    it('does NOT have IS_RECORDING key', () => {
      expect(
        (STORAGE_KEYS as Record<string, string>).IS_RECORDING,
      ).toBeUndefined();
    });

    it('does NOT have RECORDING_TAB_ID key', () => {
      expect(
        (STORAGE_KEYS as Record<string, string>).RECORDING_TAB_ID,
      ).toBeUndefined();
    });
  });
});

describe('DEFAULT_STORAGE', () => {
  describe('single-tab migration', () => {
    it('has activeTabId as null (not activeTabIds array)', () => {
      expect(DEFAULT_STORAGE.activeTabId).toBeNull();
    });

    it('does NOT have activeTabIds property', () => {
      expect(
        (DEFAULT_STORAGE as Record<string, unknown>).activeTabIds,
      ).toBeUndefined();
    });

    it('does NOT have isRecording property', () => {
      expect(
        (DEFAULT_STORAGE as Record<string, unknown>).isRecording,
      ).toBeUndefined();
    });

    it('does NOT have recordingTabId property', () => {
      expect(
        (DEFAULT_STORAGE as Record<string, unknown>).recordingTabId,
      ).toBeUndefined();
    });
  });
});
