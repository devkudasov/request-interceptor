export function sendMessage<T = unknown>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.ok) {
        resolve(response.data as T);
      } else {
        reject(new Error(response?.error ?? 'Unknown error'));
      }
    });
  });
}
