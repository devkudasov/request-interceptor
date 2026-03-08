import { initializeStorage } from './storage';
import { setupMessageHandler } from './message-handler';
import { setupTabListeners } from './tab-manager';
import { initializeFirebase, setupAuthListener } from './firebase-auth';

// Initialize Firebase on service worker startup
initializeFirebase();
setupAuthListener();

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeStorage();
    console.log('[Request Interceptor] Extension installed, storage initialized');
  }
});

setupMessageHandler();
setupTabListeners();

console.log('[Request Interceptor] Background service worker started');
