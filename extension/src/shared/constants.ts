import type { Settings, StorageSchema } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultDelay: 0,
  logEnabled: true,
  maxLogEntries: 1000,
};

export const DEFAULT_STORAGE: StorageSchema = {
  activeTabIds: [],
  isRecording: false,
  recordingTabId: null,
  rules: [],
  collections: [],
  requestLog: [],
  settings: DEFAULT_SETTINGS,
  authToken: null,
  userId: null,
};

export const MESSAGE_TYPES = {
  // Tab management
  GET_ACTIVE_TABS: 'GET_ACTIVE_TABS',
  TOGGLE_TAB: 'TOGGLE_TAB',
  TAB_STATUS_CHANGED: 'TAB_STATUS_CHANGED',

  // Rules
  GET_RULES: 'GET_RULES',
  CREATE_RULE: 'CREATE_RULE',
  UPDATE_RULE: 'UPDATE_RULE',
  DELETE_RULE: 'DELETE_RULE',
  TOGGLE_RULE: 'TOGGLE_RULE',
  REORDER_RULES: 'REORDER_RULES',
  RULES_UPDATED: 'RULES_UPDATED',

  // Collections
  GET_COLLECTIONS: 'GET_COLLECTIONS',
  CREATE_COLLECTION: 'CREATE_COLLECTION',
  UPDATE_COLLECTION: 'UPDATE_COLLECTION',
  DELETE_COLLECTION: 'DELETE_COLLECTION',
  TOGGLE_COLLECTION: 'TOGGLE_COLLECTION',

  // Recording
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  RECORDING_DATA: 'RECORDING_DATA',

  // Request log
  LOG_ENTRY: 'LOG_ENTRY',
  CLEAR_LOG: 'CLEAR_LOG',

  // Content script ↔ Injected script
  INJECT_RULES: 'INJECT_RULES',
  REQUEST_INTERCEPTED: 'REQUEST_INTERCEPTED',
  REQUEST_LOGGED: 'REQUEST_LOGGED',

  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  AUTH_STATE_CHANGED: 'AUTH_STATE_CHANGED',

  // Sync
  PUSH_TO_CLOUD: 'PUSH_TO_CLOUD',
  PULL_FROM_CLOUD: 'PULL_FROM_CLOUD',
  SYNC_STATUS: 'SYNC_STATUS',
} as const;

export const STORAGE_KEYS = {
  ACTIVE_TAB_IDS: 'activeTabIds',
  IS_RECORDING: 'isRecording',
  RECORDING_TAB_ID: 'recordingTabId',
  RULES: 'rules',
  COLLECTIONS: 'collections',
  REQUEST_LOG: 'requestLog',
  SETTINGS: 'settings',
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
} as const;

// Unique prefix for window.postMessage to avoid conflicts with page scripts
export const MESSAGE_PREFIX = '__REQ_INTERCEPTOR__';
