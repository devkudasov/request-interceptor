export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type UrlMatchType = 'exact' | 'wildcard' | 'regex';
export type ResponseType = 'json' | 'raw' | 'multipart';
export type RequestType = 'http' | 'websocket';

export interface MockRule {
  id: string;
  enabled: boolean;
  priority: number;
  collectionId: string | null;
  urlPattern: string;
  urlMatchType: UrlMatchType;
  method: HttpMethod | 'ANY';
  bodyMatch?: string;
  graphqlOperation?: string;
  requestType: RequestType;
  statusCode: number;
  responseType: ResponseType;
  responseBody: string;
  responseHeaders: Record<string, string>;
  delay: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessageRule {
  match: string;
  respond: string;
  delay: number;
}

export interface WebSocketRule extends MockRule {
  requestType: 'websocket';
  onConnect?: string;
  messageRules: WebSocketMessageRule[];
}
