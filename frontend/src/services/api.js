import { socketClient } from './socket';

const getApiBase = () => {
  let base = import.meta.env.VITE_API_URL || '/api';
  if (base.startsWith('http')) {
    base = base.replace(/\/$/, '');
    if (!base.endsWith('/api')) {
      base += '/api';
    }
  }
  return base;
};
const API_BASE = getApiBase();

let refreshPromise = null;

const isAuthEndpoint = (url) => {
  const path = typeof url === 'string' ? url : url?.url || '';
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/forgot-password') ||
    path.includes('/auth/reset-password')
  );
};

const TOKEN_KEY = 'storyloom_access_token';
const REFRESH_KEY = 'storyloom_refresh_token';
const USER_KEY = 'storyloom_user';

const getStoredToken = () =>
  localStorage.getItem(TOKEN_KEY) || localStorage.getItem('scenecraft_access_token');

const getStoredRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY) || localStorage.getItem('scenecraft_refresh_token');

const getStoredUser = () =>
  localStorage.getItem(USER_KEY) || localStorage.getItem('scenecraft_user');

const setStoredTokens = (access, refresh) => {
  if (access) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem('scenecraft_access_token', access);
  }
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem('scenecraft_refresh_token', refresh);
  }
};

const setStoredUser = (user) => {
  if (user) {
    const val = typeof user === 'string' ? user : JSON.stringify(user);
    localStorage.setItem(USER_KEY, val);
    localStorage.setItem('scenecraft_user', val);
  }
};

const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('scenecraft_access_token');
  localStorage.removeItem('scenecraft_refresh_token');
  localStorage.removeItem('scenecraft_user');
};

const clearAuthAndRedirect = () => {
  clearStoredAuth();
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/signup')
  ) {
    window.location.href = '/login';
  }
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const res = await window.fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        throw new Error('Refresh token rejected');
      }

      const json = await res.json();
      const tokens = json.data;
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error('Invalid token response structure');
      }

      setStoredTokens(tokens.accessToken, tokens.refreshToken);

      try {
        socketClient.reconnect();
      } catch (_err) {
      }

      return tokens.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const request = async (url, options = {}, isRetry = false) => {
  const res = await window.fetch(url, options);

  if (res.status === 401 && !isRetry && !isAuthEndpoint(url)) {
    try {
      const newAccessToken = await refreshAccessToken();
      const updatedHeaders = { ...(options.headers || {}) };
      if (updatedHeaders instanceof Headers) {
        updatedHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      } else {
        updatedHeaders['Authorization'] = `Bearer ${newAccessToken}`;
      }
      return await request(url, { ...options, headers: updatedHeaders }, true);
    } catch (err) {
      clearAuthAndRedirect();
      const error = new Error('Session expired. Please log in again.');
      error.status = 401;
      throw error;
    }
  }

  return res;
};

const fetch = (url, options) => request(url, options);

const getHeaders = (isMultipart = false) => {
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorMsg = data.message || `API Error (Status ${response.status})`;
    const error = new Error(errorMsg);
    if (data.code) error.code = data.code;
    if (data.errors) error.errors = data.errors;
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const api = {
  auth: {
    async register(nameOrPayload, email, password, options = {}) {
      let payload;
      if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
        const obj = nameOrPayload;
        payload = {
          name: obj.name,
          email: obj.email,
          password: obj.password,
          role: obj.role || 'reader',
          company: obj.company || obj.publisherMetadata?.company,
          website: obj.website || obj.publisherMetadata?.website,
          note: obj.note || obj.publisherMetadata?.note,
          termsAccepted: obj.termsAccepted,
        };
      } else {
        payload = {
          name: nameOrPayload,
          email,
          password,
          role: options.role || 'reader',
          company: options.company,
          website: options.website,
          note: options.note,
          termsAccepted: options.termsAccepted,
        };
      }

      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await handleResponse(res);
      if (data.success && data.data.tokens) {
        setStoredTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
        setStoredUser(data.data.user);
      }
      return data.data;
    },

    async login(email, password) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse(res);
      if (data.success && data.data.tokens) {
        setStoredTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
        setStoredUser(data.data.user);
      }
      return data.data;
    },

    async me() {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      if (data.success && data.data) {
        setStoredUser(data.data);
      }
      return data.data;
    },

    async logout() {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
      clearStoredAuth();
    },

    getCurrentUser() {
      const userStr = getStoredUser();
      return userStr ? (typeof userStr === 'string' ? JSON.parse(userStr) : userStr) : null;
    },

    isAuthenticated() {
      return !!getStoredToken();
    },

    async forgotPassword(email) {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email }),
      });
      return handleResponse(res);
    },

    async resetPassword(token, password) {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ token, password }),
      });
      return handleResponse(res);
    },
  },

  me: {
    async getLibrary(params = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.status) query.append('status', params.status);
      const qs = query.toString();
      const res = await fetch(`${API_BASE}/me/library${qs ? `?${qs}` : ''}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getReadingList(params = {}) {
      return this.getLibrary(params);
    },

    async getLibraryBook(bookId) {
      const res = await fetch(`${API_BASE}/me/library/${bookId}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async updateLibraryBook(bookId, data) {
      const res = await fetch(`${API_BASE}/me/library/${bookId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      const dataRes = await handleResponse(res);
      return dataRes.data;
    },

    async removeLibraryBook(bookId) {
      const res = await fetch(`${API_BASE}/me/library/${bookId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const dataRes = await handleResponse(res);
      return dataRes.data;
    },

    async updateSettings(settings) {
      const res = await fetch(`${API_BASE}/me/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(settings),
      });
      const dataRes = await handleResponse(res);
      return dataRes.data;
    },

    async matureAck() {
      const res = await fetch(`${API_BASE}/me/mature-ack`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      const dataRes = await handleResponse(res);
      return dataRes.data;
    },

    async updateProfile(profileData) {
      const res = await fetch(`${API_BASE}/me/profile`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(profileData),
      });
      const dataRes = await handleResponse(res);
      return dataRes.data;
    },
  },

  library: {
    async getShelf(status, params = {}) {
      return api.me.getLibrary({ status, ...params });
    },
    async updateStatus(bookId, status) {
      return api.me.updateLibraryBook(bookId, { status });
    },
    async remove(bookId) {
      return api.me.removeLibraryBook(bookId);
    },
  },

  books: {
    async list(params = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.genre) query.append('genre', params.genre);
      if (params.tag) query.append('tag', params.tag);
      if (params.search) query.append('search', params.search);
      if (params.sort) query.append('sort', params.sort);
      if (params.mature !== undefined) query.append('mature', params.mature);
      if (params.length) query.append('length', params.length);
      if (params.lengthBucket) query.append('lengthBucket', params.lengthBucket);
      if (params.minRating) query.append('minRating', params.minRating);
      if (params.completionMin !== undefined) query.append('completionMin', params.completionMin);
      if (params.wishlisted !== undefined) query.append('wishlisted', params.wishlisted);

      const qs = query.toString();
      const url = `${API_BASE}/books${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data;
    },

    async getById(id) {
      const res = await fetch(`${API_BASE}/books/${id}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async create(formData) {
      const res = await fetch(`${API_BASE}/books`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async update(id, dataOrFormData, isMultipart = false) {
      const res = await fetch(`${API_BASE}/books/${id}`, {
        method: 'PATCH',
        headers: getHeaders(isMultipart),
        body: isMultipart ? dataOrFormData : JSON.stringify(dataOrFormData),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getMine() {
      const res = await fetch(`${API_BASE}/books/writer/mine`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getPages(bookId, from = 1, to = null) {
      let url = `${API_BASE}/books/${bookId}/pages?from=${from}`;
      if (to) url += `&to=${to}`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.data;
    },

    async getSceneMarkers(bookId) {
      const res = await fetch(`${API_BASE}/books/${bookId}/scene-markers`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data?.markers || [];
    },

    async delete(id) {
      const res = await fetch(`${API_BASE}/books/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data;
    },

    async acceptTerms(bookId) {
      const res = await fetch(`${API_BASE}/books/${bookId}/accept-terms`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  uploads: {
    async avatar(file) {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_BASE}/uploads/avatar`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  documents: {
    async list() {
      const res = await fetch(`${API_BASE}/documents`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async upload(file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData,
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getById(id) {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async updateTitle(id, title) {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async delete(id) {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  jobs: {
    async getStatus(documentId, signal) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/jobs`, {
        headers: getHeaders(),
        signal,
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async retryStage(documentId, stage) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/jobs/${stage}/retry`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  story: {
    async getScenes(documentId, page, limit) {
      let url = `${API_BASE}/documents/${documentId}/scenes`;
      const params = [];
      if (page) params.push(`page=${page}`);
      if (limit) params.push(`limit=${limit}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.data;
    },

    async getCharacters(documentId, page, limit) {
      let url = `${API_BASE}/documents/${documentId}/characters`;
      const params = [];
      if (page) params.push(`page=${page}`);
      if (limit) params.push(`limit=${limit}`);
      if (params.length) url += `?${params.join('&')}`;

      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.data;
    },

    async getRelationships(documentId) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/relationships`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getTimeline(documentId) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/timeline`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getDialogue(documentId, characterId = null) {
      let url = `${API_BASE}/documents/${documentId}/story/dialogue`;
      if (characterId) url += `?characterId=${characterId}`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.data;
    },

    async getMood(documentId) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/mood`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getArc(documentId) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/arc`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getContinuity(documentId) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/continuity`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async updateContinuityStatus(documentId, issueId, status) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/story/continuity/${issueId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async search(documentId, query, filters = {}) {
      let url = `${API_BASE}/documents/${documentId}/search?q=${encodeURIComponent(query)}`;
      if (filters.character) url += `&character=${encodeURIComponent(filters.character)}`;
      if (filters.mood) url += `&mood=${encodeURIComponent(filters.mood)}`;
      if (filters.sceneRangeFrom) url += `&sceneRangeFrom=${filters.sceneRangeFrom}`;
      if (filters.sceneRangeTo) url += `&sceneRangeTo=${filters.sceneRangeTo}`;
      
      const res = await fetch(url, { headers: getHeaders() });
      const data = await handleResponse(res);
      return data.data;
    },

    async ask(documentId, question, history = []) {
      const res = await fetch(`${API_BASE}/documents/${documentId}/search/ask`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ question, history }),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  analysis: {
    normalizeSource(source) {
      if (!source) return { kind: 'document', id: null };
      if (typeof source === 'string') return { kind: 'document', id: source };
      return source;
    },

    buildQuery(params = {}) {
      const search = new URLSearchParams();
      if (params.page) search.append('page', params.page);
      if (params.limit) search.append('limit', params.limit);
      if (params.showAll !== undefined) search.append('showAll', params.showAll);
      if (params.upto !== undefined) search.append('upto', params.upto);
      if (params.offset !== undefined) search.append('offset', params.offset);
      if (params.character) search.append('character', params.character);
      if (params.mood) search.append('mood', params.mood);
      if (params.sceneRangeFrom) search.append('sceneRangeFrom', params.sceneRangeFrom);
      if (params.sceneRangeTo) search.append('sceneRangeTo', params.sceneRangeTo);
      const str = search.toString();
      return str ? `?${str}` : '';
    },

    async triggerProcessing(source, force = false) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const query = force ? '?force=true' : '';
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/process${query}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ force }),
        });
        const data = await handleResponse(res);
        return data;
      }
      return null;
    },

    async getScenes(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/scenes${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getScenes(src.id, params.page, params.limit);
    },

    async getCharacters(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/characters${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getCharacters(src.id, params.page, params.limit);
    },

    async getCharacterById(source, characterId, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/characters/${characterId}${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      const res = await fetch(`${API_BASE}/documents/${src.id}/characters/${characterId}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data;
    },

    async getRelationships(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/relationships${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getRelationships(src.id);
    },

    async getTimeline(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/timeline${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getTimeline(src.id);
    },

    async getMood(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/mood${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getMood(src.id);
    },

    async getArc(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/arc${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getArc(src.id);
    },

    async getContinuity(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/continuity${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.getContinuity(src.id);
    },

    async updateContinuityStatus(source, issueId, status) {
      const src = this.normalizeSource(source);
      let docId = src.id;
      if (src.kind === 'book') {
        if (src.documentId) {
          docId = src.documentId;
        } else {
          const book = await api.books.getById(src.id);
          docId = book?.documentId?._id || book?.documentId || src.id;
        }
      }
      return api.story.updateContinuityStatus(docId, issueId, status);
    },

    async getPitch(source, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/pitch${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return null;
    },

    async search(source, query, filters = {}, params = {}) {
      const src = this.normalizeSource(source);
      if (src.kind === 'book') {
        const mergedParams = { ...filters, ...params, q: query };
        const queryParams = new URLSearchParams();
        for (const [k, v] of Object.entries(mergedParams)) {
          if (v !== undefined && v !== null && v !== '') queryParams.append(k, v);
        }
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/search?${queryParams.toString()}`, {
          headers: getHeaders(),
        });
        const data = await handleResponse(res);
        return data;
      }
      return api.story.search(src.id, query, filters);
    },

    async semanticSearch(source, query, filters = {}, params = {}) {
      return this.search(source, query, filters, params);
    },

    async ask(source, question, params = {}) {
      const src = this.normalizeSource(source);
      const { history, ...queryParams } = params;
      if (src.kind === 'book') {
        const res = await fetch(`${API_BASE}/books/${src.id}/analysis/ask${this.buildQuery(queryParams)}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ question, history }),
        });
        const data = await handleResponse(res);
        return data;
      }
      if (api.story && typeof api.story.ask === 'function') {
        return api.story.ask(src.id, question, history);
      }
      const res = await fetch(`${API_BASE}/documents/${src.id}/search/ask`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ question, history }),
      });
      const data = await handleResponse(res);
      return data;
    },

    async getPipelineStatus(bookId, params = {}) {
      try {
        const res = await fetch(`${API_BASE}/books/${bookId}/analysis/pipeline-status${this.buildQuery(params)}`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
        const book = await api.books.getById(bookId).catch(() => null);
        const documentId = book?.documentId?._id || book?.documentId;
        if (documentId) {
          const jobsRes = await api.jobs.getStatus(documentId);
          const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.jobs || []);
          return { data: { jobs } };
        }
        return { data: { jobs: [] } };
      } catch {
        return { data: { jobs: [] } };
      }
    },

    async retryPipelineStage(bookId, stage) {
      try {
        const book = await api.books.getById(bookId).catch(() => null);
        const documentId = book?.documentId?._id || book?.documentId;
        if (documentId) {
          return api.jobs.retryStage(documentId, stage);
        }
      } catch (err) {
        console.error('retryPipelineStage failed:', err);
      }
    },
  },

  reviews: {
    async list(bookId, params = {}) {
      const bId = (bookId?._id || bookId?.id || bookId)?.toString();
      if (!bId || bId === 'undefined') return { reviews: [], stats: { ratingAvg: 0, ratingCount: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, userReview: null };
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      if (params.sort) qs.append('sort', params.sort);
      const res = await fetch(`${API_BASE}/books/${bId}/reviews?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      const inner = data?.data || {};
      return {
        ...inner,
        ...data,
        reviews: inner.reviews || data.reviews || [],
        stats: inner.stats || data.stats || { ratingAvg: 0, ratingCount: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        pagination: inner.pagination || data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
        userReview: inner.userReview !== undefined ? inner.userReview : data.userReview,
      };
    },

    async getReviews(bookId, params) { return this.list(bookId, params); },

    async create(bookId, payload) {
      const bId = (bookId?._id || bookId?.id || bookId)?.toString();
      if (!bId || bId === 'undefined') throw new Error('Book ID is missing.');
      const res = await fetch(`${API_BASE}/books/${bId}/reviews`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },
    async createReview(bookId, payload) { return this.create(bookId, payload); },

    async update(bookId, reviewId, payload) {
      const bId = (bookId?._id || bookId?.id || bookId)?.toString();
      if (!bId || bId === 'undefined') throw new Error('Book ID is missing.');
      const res = await fetch(`${API_BASE}/books/${bId}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },
    async updateReview(bookId, reviewId, payload) { return this.update(bookId, reviewId, payload); },

    async remove(bookId, reviewId) {
      const bId = (bookId?._id || bookId?.id || bookId)?.toString();
      if (!bId || bId === 'undefined') throw new Error('Book ID is missing.');
      const res = await fetch(`${API_BASE}/books/${bId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
    async deleteReview(bookId, reviewId) { return this.remove(bookId, reviewId); },

    async markRead(arg1, arg2) {
      const url = arg2 ? `${API_BASE}/books/${arg1}/reviews/${arg2}/read` : `${API_BASE}/reviews/${arg1}/read`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  reports: {
    async create(payload) {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },
    async submitAppReport(payload) { return this.create(payload); },

    async submitPublicNotice(payload) {
      const res = await fetch(`${API_BASE}/reports/public-notice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  notifications: {
    async list(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      if (params.unreadOnly) qs.append('unreadOnly', 'true');
      const res = await fetch(`${API_BASE}/notifications?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
    async getNotifications(params) { return this.list(params); },

    async getUnreadCount() {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data?.unreadCount || 0;
    },

    async markRead(notificationId) {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async markAllRead() {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  writer: {
    async getAnalytics(params = {}) {
      const qs = new URLSearchParams();
      if (params.range) qs.append('range', params.range);
      if (params.bookId) qs.append('bookId', params.bookId);
      const res = await fetch(`${API_BASE}/writer/analytics?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getReviews(params = {}) {
      const qs = new URLSearchParams();
      if (params.bookId) qs.append('bookId', params.bookId);
      if (params.rating) qs.append('rating', params.rating);
      if (params.unreadOnly) qs.append('unreadOnly', 'true');
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/writer/reviews?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getProfile(writerId) {
      const res = await fetch(`${API_BASE}/writer/profile/${writerId}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  wishlist: {
    async list(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/me/wishlist?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data;
    },

    async check(bookId) {
      const res = await fetch(`${API_BASE}/me/wishlist/${bookId}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async add(bookId, notes = '') {
      const res = await fetch(`${API_BASE}/me/wishlist/${bookId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ notes }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async remove(bookId) {
      const res = await fetch(`${API_BASE}/me/wishlist/${bookId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  pitch: {
    async get(bookId) {
      const res = await fetch(`${API_BASE}/books/${bookId}/pitch`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async regenerate(bookId) {
      const res = await fetch(`${API_BASE}/books/${bookId}/pitch/regenerate`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async clear(bookId) {
      const res = await fetch(`${API_BASE}/books/${bookId}/pitch`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  writers: {
    async getProfile(username) {
      const res = await fetch(`${API_BASE}/writers/${encodeURIComponent(username)}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async follow(username) {
      const res = await fetch(`${API_BASE}/writers/${encodeURIComponent(username)}/follow`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async unfollow(username) {
      const res = await fetch(`${API_BASE}/writers/${encodeURIComponent(username)}/follow`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  admin: {
    async getReports(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      if (params.status) qs.append('status', params.status);
      if (params.targetType) qs.append('targetType', params.targetType);
      if (params.reason) qs.append('reason', params.reason);
      const res = await fetch(`${API_BASE}/admin/reports?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async handleReportAction(reportId, payload) {
      const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async handleReport(reportId, payload) {
      return this.handleReportAction(reportId, payload);
    },

    async getPublishers(params = {}) {
      const qs = new URLSearchParams();
      if (params.status) qs.append('status', params.status);
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/admin/publishers?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return {
        ...data,
        publishers: Array.isArray(data.data) ? data.data : [],
      };
    },

    async reviewPublisher(id, { action, reason }) {
      const res = await fetch(`${API_BASE}/admin/publishers/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ action, reason }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getConversation(id, reportId) {
      const qs = new URLSearchParams();
      if (reportId) qs.append('reportId', reportId);
      const res = await fetch(`${API_BASE}/admin/conversations/${id}?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getStats() {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getPlatformStats() {
      return this.getStats();
    },

    async reviewReport(reportId, payload) {
      return this.handleReportAction(reportId, {
        action: payload.action,
        notes: payload.notes || payload.adminNotes || '',
      });
    },

    async approvePublisher(id) {
      return this.reviewPublisher(id, { action: 'approve' });
    },

    async rejectPublisher(id, reason) {
      return this.reviewPublisher(id, { action: 'reject', reason });
    },

    async getUsers(params = {}) {
      const qs = new URLSearchParams();
      if (params.search) qs.append('search', params.search);
      if (params.role) qs.append('role', params.role);
      if (params.status) qs.append('status', params.status);
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      if (params.sort) qs.append('sort', params.sort);
      if (params.order) qs.append('order', params.order);
      const res = await fetch(`${API_BASE}/admin/users?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return {
        ...data,
        users: Array.isArray(data.data) ? data.data : [],
      };
    },

    async updateUser(id, payload) {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async updateUserRole(id, role, note) {
      return this.updateUser(id, { role, note });
    },

    async suspendUser(id, suspensionDays, note) {
      return this.updateUser(id, { status: 'suspended', suspensionDays, note });
    },

    async banUser(id, note) {
      return this.updateUser(id, { status: 'banned', note });
    },

    async restoreUser(id, note) {
      return this.updateUser(id, { status: 'active', note });
    },

    async getBooks(params = {}) {
      const qs = new URLSearchParams();
      if (params.search) qs.append('search', params.search);
      if (params.genre) qs.append('genre', params.genre);
      if (params.status) qs.append('status', params.status);
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      if (params.sort) qs.append('sort', params.sort);
      if (params.order) qs.append('order', params.order);
      const res = await fetch(`${API_BASE}/admin/books?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return {
        ...data,
        books: Array.isArray(data.data) ? data.data : [],
      };
    },

    async updateBook(id, payload) {
      const res = await fetch(`${API_BASE}/admin/books/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async suspendBook(id, reason) {
      return this.updateBook(id, { action: 'suspend', reason });
    },

    async restoreBook(id, reason) {
      return this.updateBook(id, { action: 'restore', reason });
    },

    async unpublishBook(id, reason) {
      return this.updateBook(id, { action: 'unpublish', reason });
    },
  },

  publishRequests: {
    async create(payload) {
      const res = await fetch(`${API_BASE}/publish-requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async list(params = {}) {
      const qs = new URLSearchParams();
      if (params.status) qs.append('status', params.status);
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/publish-requests?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data;
    },

    async getById(id) {
      const res = await fetch(`${API_BASE}/publish-requests/${id}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async updateStatus(id, { action, note = '' }) {
      const res = await fetch(`${API_BASE}/publish-requests/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ action, note }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async blockPublisher(publisherId, reason = '') {
      const res = await fetch(`${API_BASE}/publish-requests/blocks/${publisherId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async unblockPublisher(publisherId) {
      const res = await fetch(`${API_BASE}/publish-requests/blocks/${publisherId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async listBlocked() {
      const res = await fetch(`${API_BASE}/publish-requests/blocks/all`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },

  conversations: {
    async list(params = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', params.page);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/conversations?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data;
    },

    async getById(id) {
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async getMessages(id, params = {}) {
      const qs = new URLSearchParams();
      if (params.before) qs.append('before', params.before);
      if (params.limit) qs.append('limit', params.limit);
      const res = await fetch(`${API_BASE}/conversations/${id}/messages?${qs}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async sendMessage(id, text) {
      const res = await fetch(`${API_BASE}/conversations/${id}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await handleResponse(res);
      return data.data;
    },

    async update(id, payload) {
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse(res);
      return data.data;
    },
  },
};

export default api;
