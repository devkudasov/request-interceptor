import type { LogEntry } from '@/shared/types';
import { getStorage, setStorage } from './storage';

let recordedResponses: LogEntry[] = [];

export async function startRecording(tabId: number): Promise<void> {
  recordedResponses = [];
  await setStorage('IS_RECORDING', true);
  await setStorage('RECORDING_TAB_ID', tabId);
}

export async function stopRecording(): Promise<LogEntry[]> {
  await setStorage('IS_RECORDING', false);
  await setStorage('RECORDING_TAB_ID', null);
  const captured = [...recordedResponses];
  recordedResponses = [];
  return captured;
}

export function addRecordedResponse(entry: LogEntry): void {
  recordedResponses.push(entry);
}

export function getRecordedResponses(): LogEntry[] {
  return [...recordedResponses];
}

export async function isRecording(): Promise<boolean> {
  return getStorage('IS_RECORDING');
}

export async function getRecordingTabId(): Promise<number | null> {
  return getStorage('RECORDING_TAB_ID');
}
