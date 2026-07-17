// Offline sync and caching layer for Paila Todo client
// Intercepts window.fetch to support offline use and automatic synchronization.

const DB_NAME = 'PailaOfflineDB';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;
let isOffline = !navigator.onLine;
let isSyncing = false;

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('api_cache')) {
        database.createObjectStore('api_cache', { keyPath: 'url' });
      }
      if (!database.objectStoreNames.contains('sync_queue')) {
        database.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains('id_mapping')) {
        database.createObjectStore('id_mapping', { keyPath: 'tempId' });
      }
    };
  });
};

// Database operation helpers
const getFromStore = async (storeName: string, key: any): Promise<any> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAllFromStore = async (storeName: string): Promise<any[]> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const setToStore = async (storeName: string, value: any): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteFromStore = async (storeName: string, key: any): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const clearStore = async (storeName: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Dispatch custom event for UI updates
const notifyStatusChange = async () => {
  let queueLength = 0;
  try {
    const queue = await getAllFromStore('sync_queue');
    queueLength = queue.length;
  } catch (e) {
    console.error('Failed to read queue length for status change:', e);
  }

  const event = new CustomEvent('offline-status-change', {
    detail: {
      isOffline,
      isSyncing,
      pendingCount: queueLength
    }
  });
  window.dispatchEvent(event);
};

// Optimistic Cache Updating Logic
const updateCacheOptimistically = async (url: string, method: string, bodyObj: any, tempId: string) => {
  try {
    // 1. TODOS Caching
    if (url.includes('/api/todos')) {
      const cacheKey = '/api/todos';
      const cached = await getFromStore('api_cache', cacheKey);
      let todos = cached ? cached.data : [];

      if (method === 'POST') {
        const newTodo = {
          id: tempId,
          title: bodyObj.title,
          description: bodyObj.description || '',
          priority: bodyObj.priority || 'Medium',
          category: bodyObj.category || 'Personal',
          deadline: bodyObj.deadline || null,
          repeat: bodyObj.repeat || 'None',
          reminder: bodyObj.reminder || false,
          notes: bodyObj.notes || '',
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        todos = [newTodo, ...todos];
      } else if (method === 'PUT') {
        // url is like /api/todos/:id
        const id = url.split('/').pop();
        todos = todos.map((t: any) => (t.id === id ? { ...t, ...bodyObj } : t));
      } else if (method === 'DELETE') {
        const id = url.split('/').pop();
        todos = todos.filter((t: any) => t.id !== id);
      }

      await setToStore('api_cache', { url: cacheKey, data: todos });
    }

    // 2. ROUTINES Caching
    if (url.includes('/api/routines')) {
      const cacheKey = '/api/routines';
      if (method === 'PUT') {
        await setToStore('api_cache', { url: cacheKey, data: bodyObj });
      }
    }

    // 3. TRANSACTIONS & WALLETS & REPORTS Caching
    if (url.includes('/api/finance/expense') || url.includes('/api/finance/income')) {
      const isExpense = url.includes('/api/finance/expense');
      const amount = bodyObj.amount || 0;
      const walletName = bodyObj.walletName;
      const category = bodyObj.category || bodyObj.source || 'Other';
      const description = bodyObj.description || '';
      const date = bodyObj.date || new Date().toISOString();

      // Find any cached transaction endpoint results (e.g. /api/transactions?limit=100)
      const allCaches = await getAllFromStore('api_cache');
      const txCacheKeys = allCaches
        .map((c: any) => c.url)
        .filter((k: string) => k.startsWith('/api/transactions'));

      // If we are doing a DELETE, url is /api/finance/expense/:referenceId or income/:referenceId
      const isDelete = method === 'DELETE';
      let deletedTx: any = null;

      if (isDelete) {
        const refId = url.split('/').pop();
        // Look up the transaction in cache to get its amount/walletName/category for reversing wallet/report balances
        for (const key of txCacheKeys) {
          const cache = await getFromStore('api_cache', key);
          if (cache && cache.data && cache.data.transactions) {
            const found = cache.data.transactions.find((t: any) => t.referenceId === refId || t.id === refId);
            if (found) {
              deletedTx = found;
              break;
            }
          }
        }
      }

      // Update Transactions Cache
      for (const key of txCacheKeys) {
        const cache = await getFromStore('api_cache', key);
        if (cache && cache.data && cache.data.transactions) {
          let transactions = [...cache.data.transactions];
          if (isDelete) {
            const refId = url.split('/').pop();
            transactions = transactions.filter((t: any) => t.referenceId !== refId && t.id !== refId);
          } else {
            const newTx = {
              id: tempId,
              referenceId: tempId,
              userId: 'offline-user',
              walletId: walletName,
              type: isExpense ? 'Expense' : 'Income',
              amount,
              category,
              description,
              date,
              createdAt: new Date().toISOString(),
              wallet: { name: walletName }
            };
            transactions = [newTx, ...transactions];
          }
          await setToStore('api_cache', {
            url: key,
            data: {
              ...cache.data,
              transactions,
              pagination: cache.data.pagination
                ? {
                    ...cache.data.pagination,
                    total: cache.data.pagination.total + (isDelete ? -1 : 1)
                  }
                : undefined
            }
          });
        }
      }

      // Update Wallet Cache
      const walletCacheKey = '/api/wallets';
      const walletCache = await getFromStore('api_cache', walletCacheKey);
      if (walletCache && walletCache.data) {
        const walletsData = walletCache.data;
        const currentWalletName = isDelete && deletedTx ? deletedTx.wallet?.name : walletName;
        const currentAmount = isDelete && deletedTx ? deletedTx.amount : amount;
        const currentIsExpense = isDelete && deletedTx ? (deletedTx.type === 'Expense') : isExpense;

        let delta = currentAmount;
        if (currentIsExpense) {
          // Expense deducts balance, so deleting expense adds it back, posting expense subtracts it
          delta = isDelete ? currentAmount : -currentAmount;
        } else {
          // Income adds balance, so deleting income subtracts it, posting income adds it
          delta = isDelete ? -currentAmount : currentAmount;
        }

        const wallets = walletsData.wallets.map((w: any) => {
          if (w.name === currentWalletName) {
            return { ...w, balance: Math.max(0, w.balance + delta) };
          }
          return w;
        });

        const cashBal = wallets.find((w: any) => w.name === 'Cash')?.balance || 0;
        const bankBal = wallets.find((w: any) => w.name === 'Bank')?.balance || 0;
        const esewaBal = wallets.find((w: any) => w.name === 'eSewa')?.balance || 0;

        await setToStore('api_cache', {
          url: walletCacheKey,
          data: {
            wallets,
            summary: {
              cash: cashBal,
              bank: bankBal,
              esewa: esewaBal,
              total: cashBal + bankBal + esewaBal
            }
          }
        });
      }

      // Update Reports Summary Cache
      const reportsCacheKey = '/api/reports/summary';
      const reportsCache = await getFromStore('api_cache', reportsCacheKey);
      if (reportsCache && reportsCache.data) {
        const reportsData = reportsCache.data;
        const currentCategory = isDelete && deletedTx ? deletedTx.category : category;
        const currentAmount = isDelete && deletedTx ? deletedTx.amount : amount;
        const currentIsExpense = isDelete && deletedTx ? (deletedTx.type === 'Expense') : isExpense;

        // 1. Pie Chart (expenses category breakdown)
        let pieChartData = [...(reportsData.pieChartData || [])];
        if (currentIsExpense) {
          const delta = isDelete ? -currentAmount : currentAmount;
          let catItem = pieChartData.find((p: any) => p.name === currentCategory);
          if (catItem) {
            catItem.value = Math.max(0, catItem.value + delta);
          } else if (!isDelete) {
            pieChartData.push({ name: currentCategory, value: currentAmount });
          }
          pieChartData = pieChartData.filter((p: any) => p.value > 0).sort((a, b) => b.value - a.value);
        }

        // 2. Line Chart (monthly income/expense)
        const lineChartData = [...(reportsData.lineChartData || [])];
        const txDate = new Date(isDelete && deletedTx ? deletedTx.date : date);
        const nameLabel = txDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        const monthItem = lineChartData.find((l: any) => l.name === nameLabel);
        if (monthItem) {
          const delta = isDelete ? -currentAmount : currentAmount;
          if (currentIsExpense) {
            monthItem.expense = Math.max(0, monthItem.expense + delta);
          } else {
            monthItem.income = Math.max(0, monthItem.income + delta);
          }
          monthItem.savings = Math.max(0, monthItem.income - monthItem.expense);
        }

        await setToStore('api_cache', {
          url: reportsCacheKey,
          data: {
            ...reportsData,
            pieChartData,
            lineChartData
          }
        });
      }
    }

    // 4. LOANS Caching
    if (url.includes('/api/loans')) {
      const cacheKey = '/api/loans';
      const cached = await getFromStore('api_cache', cacheKey);
      if (cached && cached.data) {
        const loanData = cached.data;
        let loansGiven = [...(loanData.loansGiven || [])];
        let loansTaken = [...(loanData.loansTaken || [])];
        let dashboard = { ...(loanData.dashboard || { totalLent: 0, totalBorrowed: 0, pendingLent: 0, pendingBorrowed: 0 }) };

        if (method === 'POST') {
          const isGiven = url.endsWith('/given');
          const newLoan = {
            id: tempId,
            name: bodyObj.name,
            phone: bodyObj.phone || '',
            amount: bodyObj.amount || 0,
            purpose: bodyObj.purpose || '',
            date: bodyObj.date || new Date().toISOString(),
            expectedReturnDate: bodyObj.expectedReturnDate || null,
            status: 'Pending',
            paybackAmount: 0,
            wallet: { name: bodyObj.walletName || 'None' }
          };

          if (isGiven) {
            loansGiven = [newLoan, ...loansGiven];
            dashboard.totalLent += newLoan.amount;
            dashboard.pendingLent += newLoan.amount;
          } else {
            loansTaken = [newLoan, ...loansTaken];
            dashboard.totalBorrowed += newLoan.amount;
            dashboard.pendingBorrowed += newLoan.amount;
          }
        } else if (method === 'PUT') {
          // url format: /api/loans/:type/:id
          const parts = url.split('/');
          const id = parts.pop();
          const type = parts.pop(); // 'given' or 'taken'

          const updateLoan = (l: any) => {
            if (l.id === id) {
              const paybackAmount = bodyObj.paybackAmount !== undefined ? bodyObj.paybackAmount : l.paybackAmount;
              const status = bodyObj.status || l.status;
              
              // Recalculate dashboard changes
              const oldPending = l.amount - l.paybackAmount;
              const newPending = l.amount - paybackAmount;
              const diff = newPending - oldPending;

              if (type === 'given') {
                dashboard.pendingLent += diff;
              } else {
                dashboard.pendingBorrowed += diff;
              }

              return { ...l, paybackAmount, status };
            }
            return l;
          };

          if (type === 'given') {
            loansGiven = loansGiven.map(updateLoan);
          } else {
            loansTaken = loansTaken.map(updateLoan);
          }
        } else if (method === 'DELETE') {
          // url format: /api/loans/:type/:id
          const parts = url.split('/');
          const id = parts.pop();
          const type = parts.pop(); // 'given' or 'taken'

          if (type === 'given') {
            const found = loansGiven.find((l: any) => l.id === id);
            if (found) {
              dashboard.totalLent -= found.amount;
              dashboard.pendingLent -= (found.amount - found.paybackAmount);
            }
            loansGiven = loansGiven.filter((l: any) => l.id !== id);
          } else {
            const found = loansTaken.find((l: any) => l.id === id);
            if (found) {
              dashboard.totalBorrowed -= found.amount;
              dashboard.pendingBorrowed -= (found.amount - found.paybackAmount);
            }
            loansTaken = loansTaken.filter((l: any) => l.id !== id);
          }
        }

        await setToStore('api_cache', {
          url: cacheKey,
          data: { loansGiven, loansTaken, dashboard }
        });
      }
    }
  } catch (e) {
    console.error('Optimistic cache update failed:', e);
  }
};

// URL rewriting helper for Capacitor / production environment
// URL rewriting helper for Capacitor / production environment
const getAbsoluteUrl = (url: string): string => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isCapacitor = window.location.protocol === 'capacitor:';
  const isExternalHost = !isLocalhost && 
    window.location.hostname !== 'paila-todo.onrender.com' && 
    !window.location.hostname.includes('vercel.app');
  
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (parsedUrl.pathname.startsWith('/api')) {
      if (isCapacitor || isExternalHost) {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://paila-todo.onrender.com';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPathname = parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname : `/${parsedUrl.pathname}`;
        return `${cleanBaseUrl}${cleanPathname}${parsedUrl.search}`;
      }
    }
  } catch (e) {
    console.error('Failed to parse URL in getAbsoluteUrl:', e);
  }
  return url;
};

// Helper to standardize all cache keys to relative pathname + search query
const getCacheKey = (url: string): string => {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch (e) {
    return url;
  }
};

// Global Fetch Interceptor
const originalFetch = window.fetch;

export const initializeOfflineSync = () => {
  // Listen to connectivity events
  window.addEventListener('online', async () => {
    isOffline = false;
    notifyStatusChange();
    await syncPendingRequests();
  });

  window.addEventListener('offline', () => {
    isOffline = true;
    notifyStatusChange();
  });

  // Intercept fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input instanceof Request) ? input.url : input.toString();

    // Check if it's an API request
    if (!url.includes('/api/')) {
      return originalFetch(input, init);
    }

    const method = init?.method?.toUpperCase() || 'GET';
    const cacheKey = getCacheKey(url);

    // Handle GET (Read) Requests
    if (method === 'GET') {
      if (isOffline) {
        // Fallback to IndexedDB cache
        const cache = await getFromStore('api_cache', cacheKey);
        if (cache) {
          return new Response(JSON.stringify(cache.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'x-offline-cache': 'true' }
          });
        }
        return new Response(JSON.stringify({ error: 'You are offline, and this data is not cached.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Online: Fetch from network and cache
        try {
          const res = await originalFetch(getAbsoluteUrl(url), init);
          if (res.ok) {
            const cloned = res.clone();
            const data = await cloned.json();
            await setToStore('api_cache', { url: cacheKey, data });
          }
          return res;
        } catch (e) {
          // Network failed, try fallback
          const cache = await getFromStore('api_cache', cacheKey);
          if (cache) {
            return new Response(JSON.stringify(cache.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'x-offline-cache': 'true' }
            });
          }
          throw e;
        }
      }
    }

    // Handle Mutation (Write) Requests: POST, PUT, DELETE
    if (isOffline) {
      // 1. Generate temp ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 2. Parse body
      let bodyObj: any = {};
      if (init?.body) {
        try {
          bodyObj = JSON.parse(init.body as string);
        } catch (_) {}
      }

      // 3. Store in Sync Queue
      await setToStore('sync_queue', {
        url: cacheKey,
        method,
        headers: init?.headers || {},
        body: init?.body || '',
        timestamp: Date.now(),
        tempId
      });

      // 4. Update the IndexedDB GET cache optimistically so UI refreshes correctly
      await updateCacheOptimistically(cacheKey, method, bodyObj, tempId);

      // 5. Notify layout that queue length changed
      notifyStatusChange();

      // 6. Return simulated response
      let mockRes: any = { success: true };
      if (cacheKey.includes('/api/todos') && method === 'POST') {
        mockRes = { id: tempId, ...bodyObj, status: 'Pending' };
      } else if ((cacheKey.includes('/api/finance/expense') || cacheKey.includes('/api/finance/income')) && method === 'POST') {
        mockRes = {
          expense: cacheKey.includes('/expense') ? { id: tempId, ...bodyObj } : undefined,
          income: cacheKey.includes('/income') ? { id: tempId, ...bodyObj } : undefined,
          walletBalance: 0,
          warning: null
        };
      } else if (cacheKey.includes('/api/loans') && method === 'POST') {
        mockRes = { id: tempId, ...bodyObj, status: 'Pending', paybackAmount: 0 };
      }

      return new Response(JSON.stringify(mockRes), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-offline-simulation': 'true' }
      });
    }

    // If online, send request normally
    return originalFetch(getAbsoluteUrl(url), init);
  };

  // Sync on startup in case there are pending items from previous sessions
  if (navigator.onLine) {
    isOffline = false;
    syncPendingRequests();
  } else {
    notifyStatusChange();
  }
};

// Sync Queue Processor
export const syncPendingRequests = async () => {
  if (isSyncing) return;

  const queue = await getAllFromStore('sync_queue');
  if (queue.length === 0) return;

  isSyncing = true;
  notifyStatusChange();

  // Load active token dynamically
  const token = localStorage.getItem('token');
  const mappings = await getAllFromStore('id_mapping');
  const idMap: Record<string, string> = {};
  mappings.forEach(m => {
    idMap[m.tempId] = m.realId;
  });

  try {
    for (const item of queue) {
      let finalUrl = item.url;
      let finalBody = item.body;

      // Replace temporary IDs in URL
      Object.entries(idMap).forEach(([temp, real]) => {
        finalUrl = finalUrl.replace(temp, real);
      });

      // Replace temporary IDs in Body
      if (finalBody) {
        Object.entries(idMap).forEach(([temp, real]) => {
          finalBody = finalBody.replace(new RegExp(temp, 'g'), real);
        });
      }

      // Inject current Authorization token
      const headers = { ...item.headers };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await originalFetch(getAbsoluteUrl(finalUrl), {
          method: item.method,
          headers,
          body: finalBody || undefined
        });

        if (response.ok) {
          // If this was a POST, the backend created it and returned the real database record.
          // Map the tempId to the server's realId so subsequent PUT/DELETE in the queue can use it.
          if (item.method === 'POST') {
            const data = await response.json();
            let realId = data.id;

            // Handle transactions custom nesting
            if (item.url.includes('/api/finance/expense') && data.expense) {
              realId = data.expense.id;
            } else if (item.url.includes('/api/finance/income') && data.income) {
              realId = data.income.id;
            }

            if (realId && item.tempId) {
              idMap[item.tempId] = realId;
              await setToStore('id_mapping', { tempId: item.tempId, realId });

              // Update the optimistic cache keys to replace temporary IDs with the real IDs!
              await replaceTempIdInCache(item.tempId, realId);
            }
          }

          // Delete from queue
          await deleteFromStore('sync_queue', item.id);
        } else {
          const errText = await response.text();
          console.error(`Offline sync request failed with status ${response.status}: ${errText}`);
          // Discard invalid/bad requests to avoid blocking the queue permanently
          if (response.status >= 400 && response.status < 500) {
            await deleteFromStore('sync_queue', item.id);
          } else {
            // Stop syncing if it's a server error or temporary outage
            break;
          }
        }
      } catch (err) {
        console.error('Offline sync connection error, will retry later:', err);
        break; // Stop loop and retry later
      }
    }

    // Check if queue is fully empty
    const remaining = await getAllFromStore('sync_queue');
    if (remaining.length === 0) {
      await clearStore('id_mapping');
      // Toast notification sync success
      const toastEvent = new CustomEvent('offline-sync-success');
      window.dispatchEvent(toastEvent);
    }
  } catch (error) {
    console.error('Error during sync processing:', error);
  } finally {
    isSyncing = false;
    notifyStatusChange();
  }
};

// Replace temporary ID in local cache with real server-generated ID
const replaceTempIdInCache = async (tempId: string, realId: string) => {
  const allCaches = await getAllFromStore('api_cache');
  for (const cache of allCaches) {
    let modified = false;
    let data = cache.data;

    // Handle arrays (like /api/todos)
    if (Array.isArray(data)) {
      data = data.map((item: any) => {
        if (item.id === tempId) {
          modified = true;
          return { ...item, id: realId };
        }
        return item;
      });
    } else if (data && typeof data === 'object') {
      // Handle nested lists like transactions list { transactions: [...] }
      if (Array.isArray(data.transactions)) {
        data.transactions = data.transactions.map((t: any) => {
          if (t.id === tempId || t.referenceId === tempId) {
            modified = true;
            return {
              ...t,
              id: t.id === tempId ? realId : t.id,
              referenceId: t.referenceId === tempId ? realId : t.referenceId
            };
          }
          return t;
        });
      }
      
      // Handle loans lists { loansGiven: [...], loansTaken: [...] }
      if (Array.isArray(data.loansGiven)) {
        data.loansGiven = data.loansGiven.map((l: any) => {
          if (l.id === tempId) {
            modified = true;
            return { ...l, id: realId };
          }
          return l;
        });
      }
      if (Array.isArray(data.loansTaken)) {
        data.loansTaken = data.loansTaken.map((l: any) => {
          if (l.id === tempId) {
            modified = true;
            return { ...l, id: realId };
          }
          return l;
        });
      }
    }

    if (modified) {
      await setToStore('api_cache', { url: cache.url, data });
    }
  }
};
