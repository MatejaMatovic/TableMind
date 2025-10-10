// pages/partner/dashboard.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChartBar,
  FaRobot,
  FaUtensils,
  FaUserTie,
  FaSignOutAlt,
  FaPlus,
  FaBell,
  FaTrash,
  FaBolt,
  FaCog,
  FaSearch,
  FaUndo,
  FaDownload,
  FaSync,
  FaCalendarAlt,
  FaClock,
  FaPrint,
  FaExchangeAlt,
  FaServer,
  FaWifi,
  FaWifiSlash,
} from "react-icons/fa";

/**
 * TableMind - upgraded dashboard with MongoDB integration
 * - Full MongoDB persistence with localStorage fallback
 * - Smart waiter assignment with AI
 * - Calendar with day-view reservations
 * - Prevent overlapping reservations per table, 1h minimum buffer
 * - Mark arrived / departed & record bill, keep history month-by-month
 * - Waiter detail + export CSV / print
 * - Background monitoring for upcoming reservations
 * - Offline-first approach with automatic sync when online
 */

const LS_KEY = "tablemind_v2_cache";
const LS_RESERVATIONS_KEY = "tablemind_v2_reservations";
const LS_WAITERS_KEY = "tablemind_v2_waiters";
const LS_TABLES_KEY = "tablemind_v2_tables";
const LS_REST_KEY = "tablemind_v2_rest";

// Helper functions
const nowIso = () => new Date().toISOString();
const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
};

export default function Dashboard() {
  const router = useRouter();

  // CORE state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [email, setEmail] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // reservations/waiters/tables
  const [reservations, setReservations] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [tables, setTables] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState("tables");
  const [editing, setEditing] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [hoveredTableId, setHoveredTableId] = useState(null);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const editorRef = useRef(null);
  const draggingRef = useRef(null);
  const aiIntervalRef = useRef(null);

  // forms
  const [showAdd, setShowAdd] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formParty, setFormParty] = useState(2);
  const [formTime, setFormTime] = useState("");
  const [formTable, setFormTable] = useState("");
  const [formWaiterAssign, setFormWaiterAssign] = useState("");
  const [formSpecialRequests, setFormSpecialRequests] = useState("");

  // calendar
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [dayViewDate, setDayViewDate] = useState(null);

  // AI/chat (kept demo)
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: "assistant", content: "👋 Zdravo! TableMind AI tu." }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // waiters UI / shifts
  const [selectedWaiters, setSelectedWaiters] = useState([]);
  const [shiftActive, setShiftActive] = useState(false);
  const [showAddWaiter, setShowAddWaiter] = useState(false);
  const [newWaiterName, setNewWaiterName] = useState("");

  // schedule management
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleWaiterId, setScheduleWaiterId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleType, setScheduleType] = useState("morning");

  // handover
  const [showHandover, setShowHandover] = useState(false);
  const [handoverFrom, setHandoverFrom] = useState("");
  const [handoverTo, setHandoverTo] = useState("");

  // pro toggles
  const [settings, setSettings] = useState({
    offlineCache: true,
    smsReminders: false, // shown as Soon
    autoMergeTables: true,
    instagramIntegration: false,
    autoAssignWaiter: true,
    smartCleaning: true,
    backgroundMonitoring: true,
    aiAssignment: true,
  });

  // notifications (no sound)
  const [notifications, setNotifications] = useState([]);

  // misc refs
  const lastNotifiedRef = useRef({});
  const tableNeedsCleaningRef = useRef({});

  // waiter detail
  const [showWaiterDetail, setShowWaiterDetail] = useState(false);
  const [viewingWaiter, setViewingWaiter] = useState(null);

  // hooks that must be stable & defined above conditionals:
  // memo map reservations by table for quick lookups + tooltip
  const reservationsByTable = useMemo(() => {
    const map = {};
    (reservations || []).forEach((r) => {
      const tid = r.tableId || r.tableId === 0 ? r.tableId : r.table || null;
      if (!tid) return;
      if (!map[tid]) map[tid] = [];
      map[tid].push(r);
    });
    // sort each by time
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(a.time) - new Date(b.time)));
    return map;
  }, [reservations]);

  // Online/offline detection
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification("Povezani ste na mrežu. Sinhronizacija podataka...", "success");
      trySyncReservations();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addNotification("Izgubljena veza sa mrežom. Radite u offline režimu.", "warning");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // API call wrapper with improved error handling
  async function apiCall(url, options = {}, fallbackFn = null) {
    if (!isOnline) {
      if (fallbackFn) {
        return fallbackFn();
      }
      throw new Error("Offline mode - server operation not available");
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        // If API returns 404, use fallback function if provided
        if (response.status === 404 && fallbackFn) {
          return fallbackFn();
        }
        
        console.error('API error:', errorMessage);
          return { error: true, message: errorMessage };
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      
      // Use fallback if provided
      if (fallbackFn) {
        return fallbackFn();
      }
      
      throw error;
    }
  }

  // helpers
  function addNotification(text, type = "info", ttl = 6000) {
    const id = Date.now() + Math.random();
    setNotifications((s) => [{ id, text, type }, ...s]);
    setTimeout(() => setNotifications((s) => s.filter((n) => n.id !== id)), ttl);
  }

  // load from localStorage
  function loadFromLocalStorage() {
    try {
      const rRaw = localStorage.getItem(LS_RESERVATIONS_KEY);
      const wRaw = localStorage.getItem(LS_WAITERS_KEY);
      const tRaw = localStorage.getItem(LS_TABLES_KEY);
      const restRaw = localStorage.getItem(LS_REST_KEY);
      
      const loadedData = {
        reservations: rRaw ? JSON.parse(rRaw) : [],
        waiters: wRaw ? JSON.parse(wRaw) : [],
        tables: tRaw ? JSON.parse(tRaw) : [],
        restaurant: restRaw ? JSON.parse(restRaw) : null
      };
      
      return loadedData;
    } catch (e) {
      console.warn("Failed to load from localStorage", e);
      return {
        reservations: [],
        waiters: [],
        tables: [],
        restaurant: null
      };
    }
  }

  // load from MongoDB on init, fallback to localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function init() {
      try {
        const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
        setEmail(userEmail);

        if (!userEmail) {
          // Create demo data if no user email
          const demoData = createDemoData();
          setRestaurant(demoData.restaurant);
          setTables(demoData.tables);
          setWaiters(demoData.waiters);
          setReservations(demoData.reservations);
          setLoading(false);
          return;
        }

        // Try to load from localStorage first for immediate UI display
        const localData = loadFromLocalStorage();
        if (localData.restaurant) {
          setRestaurant(localData.restaurant);
          setTables(localData.tables);
          setWaiters(localData.waiters);
          setReservations(localData.reservations);
        }

        if (!isOnline) {
          addNotification("Radite u offline režimu. Podaci učitani iz lokalnog skladišta.", "info");
          setLoading(false);
          return;
        }

        // Check if restaurant exists - with fallback
        const checkData = await apiCall(
          `/api/restaurants/byUser?email=${encodeURIComponent(userEmail)}`,
          {},
          () => ({ restaurantExists: !!localData.restaurant })
        );
        
        if (!checkData.restaurantExists) {
          // If no restaurant exists and we have no local data, redirect to setup
          if (!localData.restaurant) {
            router.push("/partner/setup");
            return;
          }
          // Otherwise continue with local data
          addNotification("Koriste se lokalni podaci. Sinhronizujte kada budete online.", "info");
          setLoading(false);
          return;
        }

        // Fetch restaurant details - with fallback
        const data = await apiCall(
          `/api/restaurants/details?email=${encodeURIComponent(userEmail)}`,
          {},
          () => ({ restaurant: localData.restaurant })
        );
        
        const rest = data.restaurant || data;
        setRestaurant(rest);

        // Load tables - with fallback to local or create default
        if (Array.isArray(rest.tables) && rest.tables.length > 0) {
          setTables(rest.tables.map((t, i) => ({
            id: t.id || `T${i + 1}`,
            x: typeof t.x === "number" ? t.x : 20 + (i % 5) * 140,
            y: typeof t.y === "number" ? t.y : 20 + Math.floor(i / 5) * 110,
            w: t.w || 120,
            h: t.h || 70,
            seats: t.seats || 4,
            rotation: t.rotation || 0,
          })));
        } else if (localData.tables && localData.tables.length > 0) {
          setTables(localData.tables);
        } else {
          // Initialize default tables
          const defaultTables = Array.from({ length: 10 }).map((_, i) => ({
            id: `T${i + 1}`,
            x: 20 + (i % 5) * 140,
            y: 20 + Math.floor(i / 5) * 110,
            w: 120,
            h: 70,
            seats: 4,
            rotation: 0,
          }));
          setTables(defaultTables);
          
          // Try to save to server
          try {
            await apiCall("/api/restaurants/update", {
              method: "POST",
              body: JSON.stringify({ restaurantId: rest._id, tables: defaultTables }),
            });
          } catch (error) {
            console.warn("Could not save default tables to server", error);
          }
        }

        // Load waiters - with fallback
        if (Array.isArray(rest.waiters) && rest.waiters.length) {
          const normalized = rest.waiters.map((w, i) =>
            typeof w === "string"
              ? { id: `w${i}`, name: w, onShift: false, activeCount: 0, stats: {} }
              : {
                  id: w.id || `w${i}`,
                  name: w.name || `Konobar ${i + 1}`,
                  onShift: !!w.onShift,
                  activeCount: w.activeCount || 0,
                  stats: w.stats || {},
                }
          );
          setWaiters(normalized);
        } else if (localData.waiters && localData.waiters.length > 0) {
          setWaiters(localData.waiters);
        } else {
          // Create default waiters
          const defaultWaiters = [
            { id: "w1", name: "Marko", onShift: true, activeCount: 0, stats: {} },
            { id: "w2", name: "Ana", onShift: false, activeCount: 0, stats: {} }
          ];
          setWaiters(defaultWaiters);
        }

        // Load schedules - with fallback
        if (rest._id) {
          try {
            const schedData = await apiCall(`/api/schedules?restaurantId=${rest._id}`);
            setSchedules(schedData.schedules || []);
          } catch (error) {
            console.warn("Could not load schedules", error);
            // Create default schedules
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const defaultSchedules = [
              {
                _id: "s1",
                restaurantId: rest._id,
                waiterId: "w1",
                waiterName: "Marko",
                startTime: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
                endTime: new Date(today.setHours(17, 0, 0, 0)).toISOString(),
                type: "morning",
                isActive: true
              }
            ];
            setSchedules(defaultSchedules);
          }
        }

        // Load reservations - with fallback
        if (rest._id) {
          try {
            const resData = await apiCall(`/api/reservations?restaurantId=${rest._id}`);
            const resList = Array.isArray(resData) ? resData : resData.reservations || [];
            setReservations(resList);
          } catch (error) {
            console.warn("Could not load reservations from server", error);
            // Use local reservations if available
            if (localData.reservations && localData.reservations.length > 0) {
              setReservations(localData.reservations);
            }
          }
        }

        // Start background monitoring
        if (settings.backgroundMonitoring) {
          startBackgroundMonitoring(rest._id);
        }

        addNotification("Podaci uspešno učitani", "success");
      } catch (error) {
        console.error("Initialization error:", error);
        addNotification(`Greška pri učitavanju sa servera: ${error.message}. Učitavam iz lokalnog skladišta.`, "warning");
        
        // Fallback to localStorage
        const localData = loadFromLocalStorage();
        if (localData.restaurant) {
          setRestaurant(localData.restaurant);
          setTables(localData.tables);
          setWaiters(localData.waiters);
          setReservations(localData.reservations);
        } else {
          // Create demo data if no local data
          const demoData = createDemoData();
          setRestaurant(demoData.restaurant);
          setTables(demoData.tables);
          setWaiters(demoData.waiters);
          setReservations(demoData.reservations);
        }
      } finally {
        setLoading(false);
      }
    }

    init();
    
    return () => {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
      }
    };
  }, []);

  // Create demo data for offline/new users
  function createDemoData() {
    const restaurant = {
      _id: "demo_restaurant",
      name: "Demo Restoran",
      address: "Knez Mihailova 1, Beograd",
      phone: "+381 11 123 4567",
      email: "demo@tablemind.com"
    };
    
    const tables = Array.from({ length: 10 }).map((_, i) => ({
      id: `T${i + 1}`,
      x: 20 + (i % 5) * 140,
      y: 20 + Math.floor(i / 5) * 110,
      w: 120,
      h: 70,
      seats: 4,
      rotation: 0,
    }));
    
    const waiters = [
      { id: "w1", name: "Marko", onShift: true, activeCount: 0, stats: {} },
      { id: "w2", name: "Ana", onShift: false, activeCount: 0, stats: {} },
      { id: "w3", name: "Nikola", onShift: true, activeCount: 0, stats: {} }
    ];
    
    // Create some sample reservations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const reservations = [
      {
        _id: "res1",
        customerName: "Petar Petrović",
        phone: "+381 64 123 4567",
        email: "petar@example.com",
        partySize: 4,
        time: new Date(today.setHours(19, 0, 0, 0)).toISOString(),
        tableId: "T1",
        assignedWaiterId: "w1",
        status: "booked",
        createdAt: new Date().toISOString()
      },
      {
        _id: "res2",
        customerName: "Jovana Jovanović",
        phone: "+381 64 765 4321",
        email: "jovana@example.com",
        partySize: 2,
        time: new Date(tomorrow.setHours(20, 0, 0, 0)).toISOString(),
        tableId: "T3",
        assignedWaiterId: "w3",
        status: "booked",
        createdAt: new Date().toISOString()
      }
    ];
    
    return { restaurant, tables, waiters, reservations };
  }

  // Background monitoring
  function startBackgroundMonitoring(restaurantId) {
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
    }
    
    aiIntervalRef.current = setInterval(async () => {
      try {
        const now = Date.now();

        // Check upcoming reservations (next 30 minutes)
        const upcoming = reservations.filter((r) => {
          try {
            const t = new Date(r.time).getTime();
            return t > now && t - now <= 1000 * 60 * 30;
          } catch {
            return false;
          }
        });

        // Notify about upcoming reservations
        for (const r of upcoming) {
          const key = `upcoming-${r._id || r.id}`;
          const last = lastNotifiedRef.current[key] || 0;
          
          if (now - last > 1000 * 60 * 20) {
            lastNotifiedRef.current[key] = now;
            addNotification(
              `Rezervacija za ${r.customerName || "gosta"} u ${new Date(r.time).toLocaleTimeString()} - pripremite sto ${r.tableId || ""}`,
              "info"
            );

            // Auto-assign waiter if enabled and not assigned
            if (settings.autoAssignWaiter && !r.assignedWaiterId) {
              const assignedWaiter = assignWaiterIntelligently(r.time, r.tableId);
              if (assignedWaiter) {
                assignWaiterToReservationLocally(r, assignedWaiter);
              }
            }
          }
        }

        // Check for tables needing cleaning
        if (settings.smartCleaning) {
          const pastReservations = reservations.filter((r) => {
            try {
              const t = new Date(r.time).getTime();
              return t < now && r.status === "departed";
            } catch {
              return false;
            }
          });

          pastReservations.forEach((r) => {
            if (r.tableId) {
              const key = `clean-${r.tableId}`;
              const last = lastNotifiedRef.current[key] || 0;
              
              if (now - last > 1000 * 60 * 15) {
                lastNotifiedRef.current[key] = now;
                tableNeedsCleaningRef.current[r.tableId] = true;
                addNotification(`Sto ${r.tableId} treba očistiti`, "warning");
              }
            }
          });
        }

        // Low staff warning
        if (upcoming.length >= 3) {
          const onShift = waiters.filter((w) => w.onShift).length;
          if (onShift < 2) {
            const key = "lowstaff";
            const last = lastNotifiedRef.current[key] || 0;
            
            if (now - last > 1000 * 60 * 30) {
              lastNotifiedRef.current[key] = now;
              addNotification(
                `Imate ${upcoming.length} rezervacija uskoro - preporučujemo dodatno osoblje`,
                "warning"
              );
            }
          }
        }
      } catch (error) {
        console.error("Background monitoring error:", error);
      }
    }, 45000);
  }

  function stopBackgroundMonitoring() {
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
  }

  // auto-save to localStorage as backup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (settings.offlineCache) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(LS_RESERVATIONS_KEY, JSON.stringify(reservations));
          localStorage.setItem(LS_WAITERS_KEY, JSON.stringify(waiters));
          localStorage.setItem(LS_TABLES_KEY, JSON.stringify(tables));
          localStorage.setItem(LS_REST_KEY, JSON.stringify(restaurant));
        } catch (e) {
          console.warn("saveToLocal failed", e);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [reservations, waiters, tables, restaurant, settings.offlineCache]);

  // --- server sync helpers (best-effort)
  async function trySyncReservations() {
    if (!restaurant?._id || !isOnline) return;
    setSyncing(true);
    
    try {
      await apiCall(`/api/reservations/sync`, { 
        method: "POST", 
        body: JSON.stringify({ 
          restaurantId: restaurant._id, 
          reservations 
        })
      }, () => {
        // Fallback function - just return success
        return { success: true };
      });
      
      addNotification("Sinhronizacija rezervacija uspešna", "success");
    } catch (error) {
      addNotification(`Greška pri sinhronizaciji: ${error.message}`, "error");
    } finally {
      setSyncing(false);
    }
  }

  // AI Waiter Assignment Logic - Improved to work offline
  function assignWaiterIntelligently(reservationTime, tableId) {
    if (!settings.aiAssignment) return null;

    try {
      // First, check which waiters are on shift
      const onShiftWaiters = waiters.filter(w => w.onShift);
      
      // If no waiters on shift, check all waiters
      const availableWaiters = onShiftWaiters.length > 0 ? onShiftWaiters : waiters;
      
      if (availableWaiters.length === 0) {
        addNotification("Nema dostupnih konobara za AI dodelu", "warning");
        return null;
      }
      
      // Sort by least active reservations
      const sortedWaiters = availableWaiters
        .map(w => ({ ...w, activeReservations: w.activeCount || 0 }))
        .sort((a, b) => a.activeReservations - b.activeReservations);
      
      const chosenWaiter = sortedWaiters[0];
      
      addNotification(`AI dodelio konobara: ${chosenWaiter.name}`, "success");
      return chosenWaiter;
    } catch (error) {
      console.error("AI assignment error:", error);
      addNotification(`Greška u AI dodeli: ${error.message}`, "error");
      return null;
    }
  }

  // reservation conflict check:
  // - same table cannot have overlapping reservations
  // - reserved slot must be at least 1 hour apart (buffer) from other reservations on same table
  function checkReservationConflict(tableId, timeISO, durationMinutes = 60, excludingId = null) {
    if (!tableId) return false; // if no table assigned -> no conflict
    const t = new Date(timeISO).getTime();
    const buffer = 1000 * 60 * 60; // 1 hour
    const durationMs = (durationMinutes || 60) * 60 * 1000;
    const start = t - buffer;
    const end = t + durationMs + buffer;
    const list = reservationsByTable[tableId] || [];
    for (let r of list) {
      const rid = r._id || r.id || r.localId;
      if (excludingId && excludingId === rid) continue;
      const rt = new Date(r.time).getTime();
      const rdur = (r.durationMinutes || 60) * 60 * 1000;
      const rstart = rt;
      const rend = rt + rdur;
      if (!(end <= rstart || start >= rend)) {
        return true;
      }
    }
    return false;
  }

  // add reservation (MongoDB + local)
  async function handleCreateReservation(e) {
    e?.preventDefault();

    if (!formName || !formPhone || !formTime) {
      return addNotification("Popunite ime, telefon i vreme.", "warning");
    }

    // validate time
    let iso;
    try {
      iso = new Date(formTime);
      if (isNaN(iso.getTime())) throw new Error("Invalid date");
      iso = iso.toISOString();
    } catch {
      addNotification("Neispravan format datuma", "error");
      return;
    }

    // conflict check
    if (formTable && checkReservationConflict(formTable, iso)) {
      return addNotification("Konflikt: sto je već rezervisan u tom terminu (ili nema 1h razmaka).", "warning");
    }

    // AI assign waiter if not manually selected
    let assignedWaiterId = formWaiterAssign;
    if (!assignedWaiterId && settings.aiAssignment) {
      const assignedWaiter = assignWaiterIntelligently(iso, formTable);
      assignedWaiterId = assignedWaiter ? assignedWaiter.id : null;
    }

    const payload = {
      restaurantId: restaurant?._id,
      customerName: formName,
      phone: formPhone,
      email: formEmail,
      partySize: Number(formParty) || 1,
      time: iso,
      tableId: formTable || null,
      assignedWaiterId: assignedWaiterId,
      specialRequests: formSpecialRequests,
      source: "manual",
      durationMinutes: 60,
      status: "booked"
    };

    // Create placeholder for immediate UI update
    const placeholder = { 
      _id: "local-" + Date.now(), 
      ...payload, 
      createdAt: new Date().toISOString() 
    };
    
    setReservations((s) => [placeholder, ...s]);
    
    // If offline, just keep the local placeholder
    if (!isOnline) {
      addNotification("Rezervacija sačuvana lokalno (offline režim)", "success");
      setShowAdd(false);
      resetReservationForm();
      return;
    }
    
    try {
      // Send to server
      const data = await apiCall("/api/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      }, () => {
        // Fallback function - just return the placeholder as success
        return { reservation: placeholder };
      });

      const created = data.reservation || data;
      setReservations((s) => s.map((r) => (r._id === placeholder._id ? created : r)));
      
      setShowAdd(false);
      resetReservationForm();
      
      addNotification("Rezervacija uspešno kreirana", "success");
      if (assignedWaiterId) {
        const waiter = waiters.find(w => w.id === assignedWaiterId);
        addNotification(`Dodeljen konobar: ${waiter?.name}`, "info");
      }
    } catch (error) {
      // Keep the placeholder but mark it as local-only
      setReservations((s) => s.map((r) => 
        r._id === placeholder._id ? { ...r, localOnly: true } : r
      ));
      
      addNotification(`Rezervacija sačuvana lokalno. Sinhronizujte kasnije.`, "warning");
      setShowAdd(false);
      resetReservationForm();
    }
  }

  // Reset reservation form
  function resetReservationForm() {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormParty(2);
    setFormTime("");
    setFormTable("");
    setFormWaiterAssign("");
    setFormSpecialRequests("");
  }

  // remove reservation
  async function removeReservation(id) {
    if (!confirm('1')) return;
    
    const oldReservations = [...reservations];
    
    setReservations((s) => s.map((r) => ((r._id || r.id || r.localId) === id ? { ...r, deleted: true, deletedAt: new Date().toISOString() } : r)));

    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Rezervacija arhivirana lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall(`/api/reservations?id=${id}`, { method: "DELETE" }, () => ({ success: true }));
      addNotification("Rezervacija arhivirana", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Rezervacija arhivirana lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  // mark arrived
  async function markArrived(id) {
    const oldReservations = [...reservations];
    
    setReservations((prev) => prev.map((r) => ((r._id || r.id || r.localId) === id ? { ...r, status: "arrived", arrivedAt: new Date().toISOString() } : r)));

    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Status ažuriran lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall(`/api/reservations/status`, {
        method: "POST",
        body: JSON.stringify({ 
          reservationId: id, 
          status: "arrived",
          arrivedAt: nowIso()
        }),
      }, () => ({ success: true }));
      
      addNotification("Status ažuriran - gosti su stigli", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Status ažuriran lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  // mark departed and record bill
  async function markDeparted(id, billAmount = 0) {
    const r = reservations.find(rr => (rr._id || rr.id || rr.localId) === id);
    const waiterId = r?.assignedWaiterId;
    
    setReservations((prev) => prev.map((r) => {
      if ((r._id || r.id || r.localId) === id) {
        return { ...r, status: "departed", departedAt: new Date().toISOString(), billAmount: Number(billAmount || 0) || 0 };
      }
      return r;
    }));

    if (waiterId) {
      setWaiters((prev) => prev.map((w) => {
        if (w.id === waiterId) {
          // add to stats by month string
          const month = new Date().toISOString().slice(0,7); // YYYY-MM
          const stats = {...(w.stats || {})};
          stats[month] = stats[month] || { reservations: 0, revenue: 0 };
          stats[month].reservations += 1;
          stats[month].revenue += Number(billAmount || 0);
          return { ...w, stats, activeCount: Math.max(0, (w.activeCount || 0) - 1) };
        }
        return w;
      }));
    }

    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Status ažuriran lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall(`/api/reservations/status`, {
        method: "POST",
        body: JSON.stringify({ 
          reservationId: id, 
          status: "departed",
          departedAt: nowIso(),
          billAmount: Number(billAmount || 0) || 0
        }),
      }, () => ({ success: true }));

      if (waiterId) {
        await apiCall("/api/restaurants/update", {
          method: "POST",
          body: JSON.stringify({
            restaurantId: restaurant._id,
            waiters: waiters.map(w => {
              if (w.id === waiterId) {
                const monthKey = new Date().toISOString().slice(0, 7);
                const stats = { ...(w.stats || {}) };
                const existing = stats[monthKey] || { reservations: 0, revenue: 0 };
                existing.reservations = (existing.reservations || 0) + 1;
                existing.revenue = (existing.revenue || 0) + Number(billAmount || 0);
                stats[monthKey] = existing;
                return { 
                  ...w, 
                  stats, 
                  activeCount: Math.max(0, (w.activeCount || 0) - 1) 
                };
              }
              return w;
            }),
          }),
        }, () => ({ success: true }));
      }

      addNotification("Označeno: Otišli (račun upisan)", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Status ažuriran lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  // assign waiter to reservation - local only version
  function assignWaiterToReservationLocally(reservation, waiter) {
    if (!reservation || !waiter) return;

    const resId = reservation._id || reservation.id || reservation.localId;
    
    setReservations((prev) => prev.map((r) => ((r._id || r.id || r.localId) === resId ? { ...r, assignedWaiterId: waiter.id } : r)));
    setWaiters((prev) => prev.map((w) => (w.id === waiter.id ? { ...w, activeCount: (w.activeCount || 0) + 1 } : w)));

    addNotification(`Rezervacija dodeljena: ${waiter.name}`, "success");
  }

  // assign waiter to reservation - with server sync
  async function assignWaiterToReservation(reservation, waiter) {
    if (!reservation || !waiter) return;

    // First update locally
    assignWaiterToReservationLocally(reservation, waiter);

    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Konobar dodeljen lokalno (offline režim)", "success");
      return;
    }

    const resId = reservation._id || reservation.id || reservation.localId;

    try {
      await apiCall(`/api/reservations/assign`, {
        method: "POST",
        body: JSON.stringify({ 
          reservationId: resId, 
          waiterId: waiter.id 
        }),
      }, () => ({ success: true }));

      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: waiters.map((w) =>
            w.id === waiter.id 
              ? { ...w, activeCount: (w.activeCount || 0) + 1 } 
              : w
          ),
        }),
      }, () => ({ success: true }));

    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Konobar dodeljen lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  // Schedule Management Functions
  async function createSchedule() {
    if (!scheduleWaiterId || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      addNotification("Popunite sva polja za smenu", "warning");
      return;
    }

    const startDateTime = new Date(`${scheduleDate}T${scheduleStartTime}`);
    const endDateTime = new Date(`${scheduleDate}T${scheduleEndTime}`);

    if (endDateTime <= startDateTime) {
      addNotification("Vreme kraja mora biti posle vremena početka", "warning");
      return;
    }

    const waiter = waiters.find(w => w.id === scheduleWaiterId);
    if (!waiter) {
      addNotification("Konobar nije pronađen", "error");
      return;
    }

    const scheduleData = {
      _id: "local-" + Date.now(),
      restaurantId: restaurant._id,
      waiterId: scheduleWaiterId,
      waiterName: waiter.name,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      type: scheduleType,
      isActive: true,
    };

    // Add locally first
    setSchedules(prev => [...prev, scheduleData]);
    
    // Reset form
    setScheduleWaiterId("");
    setScheduleDate("");
    setScheduleStartTime("");
    setScheduleEndTime("");
    setShowScheduleModal(false);
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Smena kreirana lokalno (offline režim)", "success");
      return;
    }

    try {
      const data = await apiCall("/api/schedules", {
        method: "POST",
        body: JSON.stringify(scheduleData),
      }, () => ({ schedule: scheduleData }));

      // Update with server data if available
      setSchedules(prev => prev.map(s => 
        s._id === scheduleData._id ? data.schedule : s
      ));
      
      addNotification("Smena uspešno kreirana", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Smena kreirana lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  // waiters management
  async function addWaiter(name) {
    if (!name) return addNotification("Ime konobara obavezno", "warning");
    if (waiters.some((w) => w.name.toLowerCase() === name.toLowerCase())) return addNotification("Konobar već postoji", "warning");
    
    const newWaiter = { id: `w${Date.now()}`, name, onShift: false, activeCount: 0, stats: {} };
    
    // Add locally first
    setWaiters((s) => [...s, newWaiter]);
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Konobar dodat lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: [...waiters, newWaiter],
        }),
      }, () => ({ success: true }));
      
      addNotification("Konobar dodat", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Konobar dodat lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  async function toggleWaiterShift(id) {
    const target = waiters.find((x) => x.id === id);
    
    // Update locally first
    setWaiters((prev) => prev.map((w) => (w.id === id ? { ...w, onShift: !w.onShift } : w)));
    
    // If offline, just keep the local change
    if (!isOnline) {
      if (target) {
        addNotification(`${target.name} ${!target.onShift ? "započeo" : "završio"} smenu (offline režim)`, "success");
      }
      return;
    }

    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: waiters.map((w) => (w.id === id ? { ...w, onShift: !w.onShift } : w)),
        }),
      }, () => ({ success: true }));
      
      if (target) {
        addNotification(`${target.name} ${!target.onShift ? "započeo" : "završio"} smenu`, "success");
      }
    } catch (error) {
      // Keep the local change but mark for sync later
      if (target) {
        addNotification(`${target.name} ${!target.onShift ? "započeo" : "završio"} smenu lokalno. Sinhronizujte kasnije.`, "warning");
      }
    }
  }

  async function startShiftForSelected(selectedIds) {
    if (!selectedIds || selectedIds.length < 1) {
      addNotification("Izaberite bar jednog konobara", "warning");
      return;
    }

    // Update locally first
    setWaiters((prev) => prev.map((w) => selectedIds.includes(w.id) ? { ...w, onShift: true } : w));
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Smene započete lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: waiters.map((w) => selectedIds.includes(w.id) ? { ...w, onShift: true } : w),
        }),
      }, () => ({ success: true }));
      
      addNotification("Smene uspešno započete", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Smene započete lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  async function endShiftForSelected(selectedIds) {
    if (!selectedIds || selectedIds.length < 1) {
      addNotification("Izaberite bar jednog konobara", "warning");
      return;
    }

    // Update locally first
    setWaiters((prev) => prev.map((w) => selectedIds.includes(w.id) ? { ...w, onShift: false } : w));
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Smene završene lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: waiters.map((w) => selectedIds.includes(w.id) ? { ...w, onShift: false } : w),
        }),
      }, () => ({ success: true }));
      
      addNotification("Smene uspešno završene", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Smene završene lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  async function performHandover(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      addNotification("Izaberite različite konobare za primopredaju", "warning");
      return;
    }

    const from = waiters.find((w) => w.id === fromId);
    const to = waiters.find((w) => w.id === toId);

    if (!from || !to) {
      addNotification("Konobar nije pronađen", "error");
      return;
    }

    const reassigned = [];
    
    // Update locally first
    setReservations((prev) =>
      prev.map((r) => {
        if (r.assignedWaiterId === fromId) {
          reassigned.push(r);
          return { ...r, assignedWaiterId: toId };
        }
        return r;
      })
    );

    setWaiters((prev) =>
      prev.map((w) => {
        if (w.id === fromId) 
          return { 
            ...w, 
            activeCount: Math.max(0, (w.activeCount || 0) - reassigned.length), 
            onShift: false 
          };
        if (w.id === toId) 
          return { 
            ...w, 
            activeCount: (w.activeCount || 0) + reassigned.length, 
            onShift: true 
          };
        return w;
      })
    );
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification(`Primopredaja uspešna: ${from.name} → ${to.name} (${reassigned.length} rezervacija) (offline režim)`, "success");
      setShowHandover(false);
      setHandoverFrom("");
      setHandoverTo("");
      return;
    }

    try {
      const assignmentPromises = reassigned.map(r => 
        apiCall("/api/reservations/assign", {
          method: "POST",
          body: JSON.stringify({ 
            reservationId: r._id || r.id, 
            waiterId: toId 
          }),
        }, () => ({ success: true }))
      );
      await Promise.all(assignmentPromises);

      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          waiters: waiters.map((w) => {
            if (w.id === fromId) 
              return { 
                ...w, 
                activeCount: Math.max(0, (w.activeCount || 0) - reassigned.length), 
                onShift: false 
              };
            if (w.id === toId) 
              return { 
                ...w, 
                activeCount: (w.activeCount || 0) + reassigned.length, 
                onShift: true 
              };
            return w;
          }),
        }),
      }, () => ({ success: true }));

      addNotification(
        `Primopredaja uspešna: ${from.name} → ${to.name} (${reassigned.length} rezervacija)`,
        "success"
      );
      setShowHandover(false);
      setHandoverFrom("");
      setHandoverTo("");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Primopredaja uspešna lokalno: ${from.name} → ${to.name}. Sinhronizujte kasnije.`, "warning");
      setShowHandover(false);
      setHandoverFrom("");
      setHandoverTo("");
    }
  }

  function openWaiterDetail(w) {
    setViewingWaiter(w);
    setShowWaiterDetail(true);
  }

  // export waiter CSV
  function exportWaiterCSV(waiter) {
    if (!waiter) return;
    // aggregate months
    const rows = [["month","reservations","revenue"]];
    const stats = waiter.stats || {};
    Object.entries(stats).forEach(([m,s]) => rows.push([m, s.reservations, s.revenue]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${waiter.name.replace(/s+/g,'_')}_stats.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification("Export CSV konobara preuzet", "success");
  }

  // export reservations for month
  function exportReservationsMonth(monthISO) {
    const rows = [["id","customerName","phone","time","tableId","waiter","status","billAmount"]];
    reservations.filter(r => !r.deleted).forEach(r => {
      const month = (r.time || r.createdAt || "").slice(0,7);
      if (!monthISO || month === monthISO) {
        rows.push([r._id || r.id || r.localId, r.customerName || "", r.phone || "", r.time || "", r.tableId || "", (waiters.find(w=>w.id===r.assignedWaiterId)?.name||""), r.status || "", r.billAmount || 0]);
      }
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reservations_${monthISO||"all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification("Export rezervacija preuzet", "success");
  }

  // print friendly view (for PDF)
  function openPrintView() {
    const w = window.open();
    const html = `
      <html><head><title>TableMind report</title></head><body style="background:#111;color:#fff;font-family:Arial;padding:20px">
        <h1>${restaurant?.name || "TableMind"}</h1>
        <h2>Rezervacije (ukupno ${reservations.length})</h2>
        <ul>
          ${reservations.filter(r=>!r.deleted).map(r=>`<li>${r.customerName} - ${new Date(r.time).toLocaleString()} - ${r.tableId||"-"} - ${r.assignedWaiterId? (waiters.find(w=>w.id===r.assignedWaiterId)?.name||r.assignedWaiterId): "-"} - ${r.status||"booked"}</li>`).join("")}
        </ul>
      </body></html>
    `;
    w.document.write(html);
    w.document.close();
    w.print();
  }

  // keyboard controls for dragging/rotation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKey(e) {
      if (!keyboardEnabled || !editing || !selectedTableId) return;
      const key = e.key.toLowerCase();
      const step = e.shiftKey ? 12 : 6;
      const deltas = { w: { dx: 0, dy: -step }, a: { dx: -step, dy: 0 }, s: { dx: 0, dy: step }, d: { dx: step, dy: 0 } };
      if (key === "r") {
        setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, rotation: ((t.rotation || 0) + 90) % 360 } : t)));
        e.preventDefault();
        return;
      }
      if (deltas[key]) {
        setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, x: Math.max(0, t.x + deltas[key].dx), y: Math.max(0, t.y + deltas[key].dy) } : t)));
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTableId, editing, keyboardEnabled]);

  // table drag
  function startTableDrag(e, tableId) {
    if (!editing) {
      setSelectedTableId(tableId);
      return;
    }
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    draggingRef.current = { id: tableId, origX: table.x, origY: table.y, startX: e.clientX, startY: e.clientY };
    function onMove(ev) {
      if (!draggingRef.current) return;
      const { id, origX, origY, startX, startY } = draggingRef.current;
      const nx = origX + (ev.clientX - startX);
      const ny = origY + (ev.clientY - startY);
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, x: Math.max(0, nx), y: Math.max(0, ny) } : t)));
    }
    function onUp() { draggingRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // add/remove table
  async function addTable() {
    const id = `T${tables.length + 1}`;
    const newTable = {
      id,
      x: 30 + (tables.length % 5) * 140,
      y: 30 + Math.floor(tables.length / 5) * 110,
      w: 120,
      h: 70,
      seats: 4,
      rotation: 0
    };

    // Add locally first
    setTables((p) => [...p, newTable]);
    setSelectedTableId(id);
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification("Sto dodat lokalno (offline režim)", "success");
      return;
    }

    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          tables: [...tables, newTable],
        }),
      }, () => ({ success: true }));
      
      addNotification("Sto uspešno dodat", "success");
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Sto dodat lokalno. Sinhronizujte kasnije.`, "warning");
    }
  }

  async function removeSelectedTable() {
    if (!selectedTableId) {
      addNotification("Nijedan sto selektovan", "warning");
      return;
    }

    // Update locally first
    setTables((p) => p.filter((t) => t.id !== selectedTableId));
    setReservations((prev) => 
      prev.map(r => r.tableId === selectedTableId ? { ...r, tableId: null } : r)
    );
    
    // If offline, just keep the local change
    if (!isOnline) {
      addNotification(`Sto ${selectedTableId} obrisan lokalno (offline režim)`, "success");
      setSelectedTableId(null);
      return;
    }

    try {
      const newTables = tables.filter((t) => t.id !== selectedTableId);
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          tables: newTables,
        }),
      }, () => ({ success: true }));
      
      addNotification(`Sto ${selectedTableId} obrisan`, "success");
      setSelectedTableId(null);
    } catch (error) {
      // Keep the local change but mark for sync later
      addNotification(`Sto ${selectedTableId} obrisan lokalno. Sinhronizujte kasnije.`, "warning");
      setSelectedTableId(null);
    }
  }

  async function saveLayoutToServer() {
    if (!restaurant || !restaurant._id) {
      addNotification("Restoran nije učitan", "error");
      return;
    }

    // If offline, can't save to server
    if (!isOnline) {
      addNotification("Ne možete sačuvati raspored dok ste offline", "warning");
      return;
    }

    setSyncing(true);
    
    try {
      await apiCall("/api/restaurants/update", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant._id,
          tables,
          waiters,
        }),
      }, () => ({ success: true }));
      
      addNotification("Raspored uspešno sačuvan", "success");
    } catch (error) {
      addNotification(`Greška pri čuvanju rasporeda: ${error.message}`, "error");
    } finally {
      setSyncing(false);
    }
  }

  // tooltip helper: first and next future reservation for table
  function tableTooltipFirstNext(tableId) {
    const arr = (reservationsByTable[tableId] || []).filter(r => !r.deleted);
    const now = Date.now();
    const future = arr.filter(r => new Date(r.time).getTime() > now);
    future.sort((a,b) => new Date(a.time) - new Date(b.time));
    return { first: future[0] || null, next: future[1] || null };
  }

  // MiniCalendar: helper to get reservations for date
  function reservationsForDate(date) {
    const dstart = new Date(date); dstart.setHours(0,0,0,0);
    const dend = new Date(dstart); dend.setDate(dstart.getDate()+1);
    return reservations.filter(r => {
      if (r.deleted) return false;
      const t = new Date(r.time).getTime();
      return t >= dstart.getTime() && t < dend.getTime();
    }).sort((a,b) => new Date(a.time) - new Date(b.time));
  }

  // open create for date
  function openCreateForDate(d) {
    setDayViewDate(d);
    setFormTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0).toISOString().slice(0,16)); // default 19:00
    setShowAdd(true);
  }

  // undo last add
  async function undoLast() {
    const last = reservations[0];
    if (!last) {
      addNotification("Nema rezervacija za poništavanje", "warning");
      return;
    }

    if (!confirm(`Poništiti poslednju rezervaciju (${last.customerName || "?"})?`)) 
      return;

    await removeReservation(last._id || last.id);
  }

  // UI small helpers: filter reservations
  const [searchQuery, setSearchQuery] = useState("");
  const filteredReservations = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    if (!q) return reservations.filter(r=>!r.deleted).sort((a,b)=>new Date(a.time)-new Date(b.time));
    return reservations.filter(r => !r.deleted && (r.customerName?.toLowerCase().includes(q) || r.phone?.includes(q) || (r.tableId||"").toString().includes(q)));
  }, [reservations, searchQuery]);

  // Simple stats
  const stats = useMemo(() => {
    // Real stats based on actual data
    const resPerDay = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayRes = reservations.filter(r => {
        if (r.deleted) return false;
        const resDate = new Date(r.time);
        return resDate.getDate() === date.getDate() && 
               resDate.getMonth() === date.getMonth() && 
               resDate.getFullYear() === date.getFullYear();
      });
      
      resPerDay.push({
        label: i === 0 ? "Danas" : `-${i}d`,
        value: dayRes.length
      });
    }
    
    // Calculate occupancy based on tables and reservations
    const totalTables = tables.length;
    const activeReservations = reservations.filter(r => 
      !r.deleted && 
      (r.status === "booked" || r.status === "arrived")
    ).length;
    
    const occupancy = totalTables > 0 ? 
      Math.min(100, Math.round((activeReservations / totalTables) * 100)) : 0;
    
    return { resPerDay, occupancy };
  }, [reservations, tables]);

  // AI chat (demo)
  function sendAi() {
    if (!aiInput.trim() || aiLoading) return;
    
    const userMessage = { role: "user", content: aiInput };
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Razumem, proslediću informaciju timu.",
        "Trenutno je to u razvoju, biće dostupno uskoro.",
        "Mogu vam pomoći oko toga. Šta vas konkretno zanima?",
        "Analizirao sam podatke i preporučujem da dodate još jednog konobara u smenu.",
        "Prema statistici, danas očekujemo povećan broj gostiju.",
      ];
      
      const aiResponse = { 
        role: "assistant", 
        content: responses[Math.floor(Math.random() * responses.length)] 
      };
      
      setAiMessages(prev => [...prev, aiResponse]);
      setAiLoading(false);
    }, 1000);
  }

  // render
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p>Učitavanje...</p>
      </div>
    </div>;
  }

  // hovered / selected
  const hoveredTable = tables.find(t => t.id === hoveredTableId);
  const selectedTable = tables.find(t => t.id === selectedTableId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/60">
        <div>
          <h1 className="text-2xl font-bold">{restaurant?.name || "TableMind Dashboard"}</h1>
          <p className="text-sm text-gray-400">Upravljanje rezervacijama i smenama — Pro</p>
        </div>
        <div className="flex items-center gap-3">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/80 text-sm">
              <FaWifiSlash className="animate-pulse" />
              <span>Offline režim</span>
            </div>
          )}
          
          {syncing && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-sm">
              <FaSync className="animate-spin" />
              <span>Sinhronizacija...</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 text-sm">
            <FaCog />
            <span className="text-xs text-gray-300">{settings.autoAssignWaiter ? "AI: aktivan" : "AI: isključen"}</span>
          </div>
          
          <button onClick={() => addNotification("Demo notifikacija (bez zvuka)")} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-xl text-black"><FaBell /> Notifikacije</button>
          
          <button onClick={() => { localStorage.removeItem("userEmail"); router.push("/auth/login"); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl"><FaSignOutAlt /> Odjava</button>
        </div>
      </div>

      {/* notifications */}
      <div className="fixed right-6 top-20 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id} 
              initial={{ opacity:0, x:40 }} 
              animate={{ opacity:1, x:0 }} 
              exit={{ opacity:0, x:40 }} 
              className={`px-4 py-2 rounded-lg shadow border ${
                n.type === "error"
                  ? "bg-red-900 border-red-700"
                  : n.type === "warning"
                  ? "bg-yellow-900 border-yellow-700"
                  : n.type === "success"
                  ? "bg-green-900 border-green-700"
                  : "bg-gray-800 border-gray-700"
              }`}
            >
              {n.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MAIN */}
      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-72 bg-gray-900/80 border-r border-gray-800 p-4">
          <nav className="space-y-2">
            <button onClick={() => setActiveTab("tables")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeTab === "tables" ? "bg-blue-600" : "hover:bg-gray-800"}`}><FaUtensils /> Stolovi</button>
            <button onClick={() => setActiveTab("reservations")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeTab === "reservations" ? "bg-blue-600" : "hover:bg-gray-800"}`}><FaChartBar /> Rezervacije</button>
            <button onClick={() => setActiveTab("waiters")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeTab === "waiters" ? "bg-blue-600" : "hover:bg-gray-800"}`}><FaUserTie /> Konobari</button>
            <button onClick={() => setActiveTab("schedules")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeTab === "schedules" ? "bg-blue-600" : "hover:bg-gray-800"}`}><FaCalendarAlt /> Raspored</button>
            <button onClick={() => setActiveTab("ai")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${activeTab === "ai" ? "bg-blue-600" : "hover:bg-gray-800"}`}><FaRobot /> AI pomoć</button>

            <div className="mt-6 border-t border-gray-800 pt-4">
              <p className="text-sm text-gray-400 mb-2">Pro funkcije</p>
              <div className="grid gap-2">
                <button onClick={() => setSettings(p => ({ ...p, offlineCache: !p.offlineCache }))} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm flex justify-between items-center">
                  <span><strong className="mr-2">•</strong> Offline cache</span>
                  <span className={`px-2 py-1 rounded text-xs ${settings.offlineCache ? "bg-green-600":"bg-neutral-700"}`}>{settings.offlineCache ? "On" : "Off"}</span>
                </button>

                <button className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm flex justify-between items-center opacity-60 cursor-not-allowed" title="SMS / Email podsjetnici treba integraciju">
                  <span><strong className="mr-2">•</strong> SMS / Email podsjetnici</span>
                  <span className="px-2 py-1 rounded text-xs bg-neutral-700">Soon</span>
                </button>

                <button onClick={() => setSettings(p => ({ ...p, autoAssignWaiter: !p.autoAssignWaiter }))} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm flex justify-between items-center">
                  <span><strong className="mr-2">•</strong> Automatska dodela konobara</span>
                  <span className={`px-2 py-1 rounded text-xs ${settings.autoAssignWaiter ? "bg-green-600":"bg-neutral-700"}`}>{settings.autoAssignWaiter ? "On":"Off"}</span>
                </button>

                <button onClick={() => setSettings(p => ({ ...p, smartCleaning: !p.smartCleaning }))} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm flex justify-between items-center">
                  <span><strong className="mr-2">•</strong> Smart Cleaning</span>
                  <span className={`px-2 py-1 rounded text-xs ${settings.smartCleaning ? "bg-green-600":"bg-neutral-700"}`}>{settings.smartCleaning ? "On":"Off"}</span>
                </button>

                <button onClick={() => setShowHandover(true)} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm">
                  <strong className="mr-2">•</strong> Primopredaja smene
                </button>

                <button onClick={() => addNotification("Instagram rezervacije - Soon")} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm opacity-60 cursor-not-allowed">
                  <strong className="mr-2">•</strong> Instagram rezervacije
                </button>

                <button onClick={() => exportReservationsMonth(null)} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm">
                  <strong className="mr-2">•</strong> Export CSV / PDF
                </button>

                <button onClick={() => addNotification("Multilokal (demo)")} className="text-left bg-gray-800 px-3 py-2 rounded hover:bg-gray-700 text-sm">
                  <strong className="mr-2">•</strong> Multilokal upravljanje
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs text-gray-500">Brze radnje</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowAddWaiter(true)} className="flex-1 bg-green-600 px-3 py-2 rounded">Dodaj konobara</button>
                <button onClick={() => setShowScheduleModal(true)} className="flex-1 bg-blue-600 px-3 py-2 rounded">Raspored</button>
              </div>
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 overflow-auto">
          {/* TABLES */}
          {activeTab === "tables" && (
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Raspored stolova</h2>
                <div className="text-sm text-gray-400">2D prikaz — pravougaoni stolovi • WASD / R • Drag</div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => { setEditing(s => !s); addNotification(editing ? "Editor isključen" : "Editor uključen"); }} className={`px-3 py-2 rounded ${editing ? "bg-red-600" : "bg-green-600"}`}>{editing ? "Isključi editor":"Uključi editor"}</button>
                <button onClick={addTable} className="px-3 py-2 rounded bg-blue-600"><FaPlus /> Dodaj sto</button>
                <button onClick={removeSelectedTable} className="px-3 py-2 rounded bg-red-600"><FaTrash /> Obriši selekt.</button>
                <button onClick={saveLayoutToServer} disabled={syncing || !isOnline} className="px-3 py-2 rounded bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-50">
                  {syncing ? <FaSync className="inline animate-spin mr-1" /> : <FaBolt className="inline mr-1" />} 
                  {syncing ? "Čuvanje..." : "Sačuvaj raspored"}
                </button>

                <label className="ml-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={keyboardEnabled} onChange={e => setKeyboardEnabled(e.target.checked)} /> Omogući WASD</label>
              </div>

              <div ref={editorRef} className="relative bg-neutral-900 h-[520px] rounded-lg border border-neutral-800 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#00000014_1px,transparent_1px),linear-gradient(180deg,#00000014_1px,transparent_1px)] bg-[length:40px_40px]" />
                {tables.map((t) => {
                  const isSelected = selectedTableId === t.id;
                  const needsCleaning = tableNeedsCleaningRef.current[t.id];
                  const tooltipInfo = tableTooltipFirstNext(t.id);
                  return (
                    <div key={t.id}
                      onMouseDown={(e) => startTableDrag(e, t.id)}
                      onMouseEnter={() => setHoveredTableId(t.id)}
                      onMouseLeave={() => setHoveredTableId(hid => hid === t.id ? null : hid)}
                      style={{ left: t.x, top: t.y, width: t.w, height: t.h, transform: `rotate(${t.rotation||0}deg)` }}
                      className={`absolute select-none flex flex-col items-center justify-center rounded shadow ${isSelected ? "ring-2 ring-cyan-400 z-50":"z-20"} bg-gradient-to-br ${needsCleaning ? "from-red-400/10 to-red-400/5 border-red-600":"from-yellow-200/5 to-yellow-200/3 border-neutral-700"} cursor-${editing ? "move":"pointer"}`}
                      onDoubleClick={() => setSelectedTableId(t.id)}
                      title={`${t.id} — ${t.seats} mesta`}
                    >
                      <div className="text-sm font-semibold text-white/90">{t.id}</div>
                      <div className="text-xs text-white/70">{t.seats} mesta {needsCleaning && <span className="text-xs text-red-300 ml-2">• ČIŠĆENJE</span>}</div>

                      {/* badge: upcoming */}
                      <div className="absolute -top-2 -right-2 bg-indigo-600 text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {(reservationsByTable[t.id] || []).filter(r => new Date(r.time).getTime() > Date.now()).length}
                      </div>

                      {/* hovered inline tooltip with first/next */}
                      {hoveredTableId === t.id && tooltipInfo && (
                        <div className="absolute left-full ml-3 w-64 p-2 rounded bg-black/80 border border-neutral-700 text-xs z-60">
                          <div className="font-semibold">{t.id} — raspored</div>
                          <div className="mt-2">
                            <div className="text-slate-300">Prva: {tooltipInfo.first ? `${tooltipInfo.first.customerName} @ ${new Date(tooltipInfo.first.time).toLocaleTimeString()}` : "nema"}</div>
                            <div className="text-slate-300">Sledeća: {tooltipInfo.next ? `${tooltipInfo.next.customerName} @ ${new Date(tooltipInfo.next.time).toLocaleTimeString()}` : "nema"}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* hovered table panel */}
                {hoveredTable && (
                  <div style={{ left: Math.min((hoveredTable.x + hoveredTable.w + 12), (editorRef.current ? editorRef.current.clientWidth - 220 : 600)), top: Math.max(hoveredTable.y, 8) }} className="absolute w-56 p-3 rounded bg-black/80 border border-neutral-700 shadow-lg text-sm z-60">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{hoveredTable.id}</div>
                      <div className="text-xs text-slate-400">{hoveredTable.rotation || 0}°</div>
                    </div>
                    <div className="text-xs text-slate-300 mt-2">Sedišta: {hoveredTable.seats}</div>
                    <div className="text-xs text-slate-300">Pozicija: x {Math.round(hoveredTable.x)} • y {Math.round(hoveredTable.y)}</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button onClick={() => { setSelectedTableId(hoveredTable.id); addNotification(`Selektovan ${hoveredTable.id}`); }} className="px-2 py-1 rounded bg-cyan-600 text-black text-xs">Selektuj</button>
                      <button onClick={() => { setTables(p => p.map(tt => tt.id === hoveredTable.id ? { ...tt, rotation: ((tt.rotation||0)+90)%360 } : tt)); addNotification(`Sto ${hoveredTable.id} rotiran`); }} className="px-2 py-1 rounded bg-indigo-600 text-xs">Rotiraj R</button>
                      <button onClick={() => { setFormTable(hoveredTable.id); setShowAdd(true); }} className="px-2 py-1 rounded bg-emerald-600 text-xs">Rezerviši</button>
                      {needsCleaning && (
                        <button onClick={() => { tableNeedsCleaningRef.current[hoveredTable.id] = false; addNotification(`Sto ${hoveredTable.id} obeležen kao očišćen`); }} className="px-2 py-1 rounded bg-red-600 text-xs">Očisti</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedTable && (
                <div className="mt-4 bg-neutral-800 p-3 rounded border border-neutral-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Selektovan: {selectedTable.id}</div>
                      <div className="text-xs text-slate-400">Ažurirajte parametre</div>
                    </div>
                    <div className="text-xs text-slate-400">Rotacija: {selectedTable.rotation || 0}°</div>
                  </div>

                  <div className="mt-3 flex gap-3">
                    <label className="text-xs flex items-center gap-2">Sedišta
                      <input type="number" min="1" className="w-20 p-1 bg-neutral-900 rounded" value={selectedTable.seats} onChange={(e) => { const v = parseInt(e.target.value || "4", 10); setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, seats: v } : t)); }} />
                    </label>

                    <label className="text-xs flex items-center gap-2">Širina
                      <input type="number" className="w-28 p-1 bg-neutral-900 rounded" value={selectedTable.w} onChange={(e) => { const v = parseInt(e.target.value || "120", 10); setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, w: v } : t)); }} />
                    </label>

                    <label className="text-xs flex items-center gap-2">Visina
                      <input type="number" className="w-28 p-1 bg-neutral-900 rounded" value={selectedTable.h} onChange={(e) => { const v = parseInt(e.target.value || "70", 10); setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, h: v } : t)); }} />
                    </label>

                    <button onClick={() => setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, rotation: ((t.rotation||0)+90)%360 } : t))} className="px-3 py-1 rounded bg-indigo-600">Rotiraj R</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* RESERVATIONS */}
          {activeTab === "reservations" && (
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Rezervacije</h2>
                <div className="flex gap-3">
                  <button onClick={() => { setShowAdd(true); }} className="bg-green-600 px-3 py-2 rounded">Nova rezervacija</button>
                  <button onClick={() => { trySyncReservations(); }} className="bg-blue-600 px-3 py-2 rounded" disabled={!isOnline}>
                    {syncing ? <FaSync className="inline animate-spin mr-1" /> : "Sync"}
                  </button>
                  <button onClick={undoLast} className="bg-neutral-700 px-3 py-2 rounded"><FaUndo /> Undo</button>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 bg-neutral-800 px-3 py-2 rounded w-full">
                  <FaSearch />
                  <input placeholder="Pretraži po imenu, telefonu, stolu..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="bg-transparent outline-none w-full" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSearchQuery(""); }} className="px-3 py-2 rounded bg-gray-700">Reset</button>
                </div>
              </div>

              <div className="space-y-3 mt-3">
                {filteredReservations.length === 0 && <div className="text-gray-400">Nema rezervacija.</div>}
                {filteredReservations.map((r) => (
                  <div key={r._id || r.id || r.localId} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-700">
                    <div>
                      <div className="font-semibold">
                        {r.customerName || r.name || "Anonim"} 
                        {r.status === "arrived" && <span className="text-xs bg-green-600 px-2 rounded ml-2">Stigli</span>} 
                        {r.status === "departed" && <span className="text-xs bg-gray-600 px-2 rounded ml-2">Otišli</span>}
                        {r.localOnly && <span className="text-xs bg-yellow-600 px-2 rounded ml-2">Lokalno</span>}
                      </div>
                      <div className="text-sm text-gray-400">{r.phone || "-"} • {r.partySize || r.size || "-"} osobe • {fmt(r.time || r.createdAt || r.timeString)}</div>
                      <div className="text-xs text-gray-500 mt-1">Assigned: {r.assignedWaiterId ? (waiters.find(w => w.id === r.assignedWaiterId)?.name || r.assignedWaiterId) : "nije dodeljeno"} • Table: {r.tableId || "-"}</div>
                      {r.billAmount != null && <div className="text-xs text-gray-300 mt-1">Račun: {r.billAmount} RSD</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        const assignedWaiter = assignWaiterIntelligently(r.time, r.tableId);
                        if (assignedWaiter) {
                          assignWaiterToReservation(r, assignedWaiter);
                        } else {
                          addNotification("Nema dostupnih konobara za dodelu", "warning");
                        }
                      }} className="bg-indigo-600 px-3 py-2 rounded">Dodeli</button>

                      <button onClick={() => markArrived(r._id || r.id || r.localId)} className="bg-emerald-600 px-3 py-2 rounded">Stigli</button>
                      <button onClick={() => {
                        const amount = prompt("Unesite iznos računa (RSD):");
                        markDeparted(r._id || r.id || r.localId, amount ? Number(amount) : 0);
                      }} className="bg-yellow-600 px-3 py-2 rounded">Otišli</button>

                      <button onClick={() => { const id = r._id || r.id || r.localId; removeReservation(id); }} className="bg-red-600 px-3 py-2 rounded flex items-center gap-2"><FaTrash /> Arhiviraj</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SCHEDULES TAB */}
          {activeTab === "schedules" && (
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Raspored Smena</h2>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700"
                >
                  <FaPlus className="inline mr-2" /> Nova Smena
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.map((schedule) => {
                  const waiter = waiters.find(w => w.id === schedule.waiterId);
                  const isActive = new Date(schedule.startTime) <= new Date() && new Date(schedule.endTime) >= new Date();
                  
                  return (
                    <div key={schedule._id} className={`bg-gray-800 p-4 rounded-xl border ${isActive ? 'border-green-500' : 'border-gray-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{waiter?.name || 'Nepoznat konobar'}</div>
                        <div className={`px-2 py-1 rounded text-xs ${isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
                          {isActive ? 'Aktivna' : 'Planirana'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        <FaClock className="inline mr-1" />
                        {new Date(schedule.startTime).toLocaleTimeString()} - {new Date(schedule.endTime).toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        <FaCalendarAlt className="inline mr-1" />
                        {new Date(schedule.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 capitalize">
                        Tip: {schedule.type}
                      </div>
                    </div>
                  );
                })}
                {schedules.length === 0 && (
                  <div className="col-span-full text-center text-gray-400 py-8">
                    Nema zakazanih smena. Kliknite &quot;Nova Smena&quot; da dodate.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* WAITERS */}
          {activeTab === "waiters" && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Konobari i smene</h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (selectedWaiters.length > 0) startShiftForSelected(selectedWaiters);
                    else startShiftForSelected(waiters.map(w => w.id));
                    setShiftActive(true);
                  }} className="bg-gradient-to-r from-green-500 to-teal-500 px-4 py-2 rounded">{shiftActive ? "Smena aktivna" : "Start smenu"}</button>
                </div>
              </div>

              <div className="space-y-3">
                {waiters.map((w) => (
                  <div key={w.id} className="bg-gray-800 rounded-xl p-3 flex items-center justify-between border border-gray-700">
                    <div className="flex items-center gap-3">
                      {!shiftActive ? (
                        <input type="checkbox" checked={selectedWaiters.includes(w.id)} onChange={() => setSelectedWaiters(prev => prev.includes(w.id) ? prev.filter(x=>x!==w.id) : [...prev, w.id])} className="accent-green-500" />
                      ) : (
                        <div className={`w-3 h-3 rounded-full ${w.onShift ? "bg-green-400" : "bg-gray-600"}`} />
                      )}
                      <div>
                        <div className="font-semibold">{w.name}</div>
                        <div className="text-xs text-gray-400">{w.onShift ? "U smeni" : "Van smene"}</div>
                        <div className="text-xs text-gray-400">Aktivne rezervacije: {w.activeCount || 0}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleWaiterShift(w.id)} className={`px-2 py-1 rounded ${w.onShift ? "bg-red-600" : "bg-green-600"}`}>{w.onShift ? "End" : "Start"}</button>
                      <button onClick={() => { setViewingWaiter(w); setShowWaiterDetail(true); }} className="px-2 py-1 rounded bg-indigo-600">Pregled</button>
                      <button onClick={async () => {
                        if (!confirm('1')) return;
                        
                        // Update locally first
                        setWaiters((prev) => prev.filter((x) => x.id !== w.id));
                        
                        // If offline, just keep the local change
                        if (!isOnline) {
                          addNotification("Konobar obrisan lokalno (offline režim)", "success");
                          return;
                        }
                        
                        try {
                          await apiCall("/api/restaurants/update", {
                            method: "POST",
                            body: JSON.stringify({
                              restaurantId: restaurant._id,
                              waiters: waiters.filter((x) => x.id !== w.id),
                            }),
                          }, () => ({ success: true }));
                          
                          addNotification("Konobar obrisan", "success");
                        } catch (error) {
                          // Keep the local change but mark for sync later
                          addNotification(`Konobar obrisan lokalno. Sinhronizujte kasnije.`, "warning");
                        }
                      }} className="px-2 py-1 rounded bg-red-700"><FaTrash /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="flex gap-2">
                  <input id="new-w" placeholder="Novo ime" className="flex-1 p-2 bg-neutral-900 rounded" />
                  <button onClick={() => { const el = document.getElementById("new-w"); if (!el) return; const name = (el.value||"").trim(); if (!name) return addNotification("Unesite ime"); addWaiter(name); el.value=""; }} className="px-3 py-2 rounded bg-cyan-600 text-black">Dodaj</button>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => startShiftForSelected(waiters.filter(w => !w.onShift).slice(0,2).map(w=>w.id))} className="flex-1 px-3 py-2 rounded bg-emerald-600">Start smenu (primer)</button>
                  <button onClick={() => endShiftForSelected(waiters.filter(w => w.onShift).slice(0,2).map(w=>w.id))} className="flex-1 px-3 py-2 rounded bg-red-600">End smenu (primer)</button>
                </div>
              </div>
            </section>
          )}

          {/* AI */}
          {activeTab === "ai" && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">AI Asistent</h2>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-w-2xl">
                <div className="space-y-3 max-h-64 overflow-auto">
                  {aiMessages.map((m,i) => (<div key={i} className={`p-3 rounded ${m.role==="assistant"? "bg-gray-800":"bg-blue-900"} text-sm`}><div className="text-xs text-gray-400">{m.role}</div><div>{m.content}</div></div>))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input value={aiInput} onChange={(e)=>setAiInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendAi()} placeholder="Pošaljite poruku AI-ju..." className="flex-1 p-2 rounded bg-gray-800 outline-none" />
                  <button onClick={sendAi} disabled={aiLoading} className="bg-blue-600 px-4 py-2 rounded">{aiLoading ? "..." : "Pošalji"}</button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-neutral-800 rounded">
                <p className="text-sm text-gray-400 mb-2">AI Funkcionalnosti:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Automatska dodela konobara na osnovu smena</li>
                  <li>• Provera dostupnosti konobara u realnom vremenu</li>
                  <li>• Ravnomerna raspodela rezervacija</li>
                  <li>• Automatsko obaveštenje 30 minuta pre rezervacije</li>
                  <li>• Upozorenje za stolove koji trebaju čišćenje</li>
                  <li>• Upozorenje kada je potrebno dodatno osoblje</li>
                  <li>• Offline režim rada sa automatskom sinhronizacijom</li>
                </ul>
              </div>
            </section>
          )}

          {/* STATISTICS */}
          <section className="mt-6">
            <h3 className="text-lg font-bold mb-3">Statistika</h3>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-400">Rezervacije (poslednjih 7 dana)</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => addNotification("7d (demo)")} className="px-3 py-1 rounded bg-blue-600">7d</button>
                </div>
              </div>

              <SimpleBarChart data={stats.resPerDay} />

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Procenat zauzetosti</div>
                  <div className="text-2xl font-bold">{stats.occupancy}%</div>
                </div>

                <div>
                  <button onClick={openPrintView} className="bg-indigo-600 px-4 py-2 rounded">
                    <FaPrint className="inline mr-2" /> Štampaj izveštaj
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Calendar mini */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Kalendar</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()-1); setCalendarDate(d); }} className="px-3 py-1 rounded bg-gray-700">Prev</button>
                <div className="px-3 py-1 rounded bg-neutral-800">{calendarDate.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
                <button onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth()+1); setCalendarDate(d); }} className="px-3 py-1 rounded bg-gray-700">Next</button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <MiniCalendar monthDate={calendarDate} onDayClick={(d) => { setDayViewDate(d); setShowAdd(true); }} reservationsForDate={(d)=>reservationsForDate(d)} />
            </div>
          </section>
        </main>
      </div>

      {/* Add waiter modal */}
      <AnimatePresence>
        {showAddWaiter && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div initial={{scale:0.98}} animate={{scale:1}} exit={{scale:0.98}} className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-96">
              <h4 className="font-bold mb-3">Dodaj konobara</h4>
              <input value={newWaiterName} onChange={(e)=>setNewWaiterName(e.target.value)} placeholder="Ime konobara" className="w-full p-2 bg-gray-800 rounded mb-3" />
              <div className="flex justify-end gap-2">
                <button onClick={()=>setShowAddWaiter(false)} className="px-3 py-2 rounded bg-gray-700">Otkaži</button>
                <button onClick={()=>{ addWaiter(newWaiterName); setNewWaiterName(""); setShowAddWaiter(false); }} className="px-3 py-2 rounded bg-green-600">Sačuvaj</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-96"
            >
              <h4 className="font-bold mb-3">Kreiraj Smenu</h4>
              
              <div className="space-y-3">
                <select
                  value={scheduleWaiterId}
                  onChange={(e) => setScheduleWaiterId(e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded"
                >
                  <option value="">Izaberi konobara</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded"
                  min={new Date().toISOString().split('T')[0]}
                />

                <div className="flex gap-2">
                  <input
                    type="time"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="flex-1 p-2 bg-gray-800 rounded"
                    placeholder="Početak"
                  />
                  <input
                    type="time"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="flex-1 p-2 bg-gray-800 rounded"
                    placeholder="Kraj"
                  />
                </div>

                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded"
                >
                  <option value="morning">Jutarnja smena</option>
                  <option value="afternoon">Popodnevna smena</option>
                  <option value="evening">Večernja smena</option>
                  <option value="night">Noćna smena</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Otkaži
                </button>
                <button
                  onClick={createSchedule}
                  className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700"
                >
                  Kreiraj Smenu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create reservation modal - includes 2D table pick */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.form initial={{scale:0.98}} animate={{scale:1}} exit={{scale:0.98}} onSubmit={handleCreateReservation} className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">Nova rezervacija {dayViewDate ? `— ${dayViewDate.toLocaleDateString()}` : ""}</h4>
                <div className="text-xs text-gray-400">Možete dodeliti sto i konobara</div>
              </div>

              <div className="space-y-2">
                <input value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder="Ime gosta" className="w-full p-2 bg-neutral-800 rounded" />
                <input value={formPhone} onChange={(e)=>setFormPhone(e.target.value)} placeholder="Telefon" className="w-full p-2 bg-neutral-800 rounded" />
                <input value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} placeholder="Email (opciono)" type="email" className="w-full p-2 bg-neutral-800 rounded" />
                <div className="flex gap-2">
                  <input type="number" value={formParty} onChange={(e)=>setFormParty(e.target.value)} placeholder="Broj osoba" className="w-32 p-2 bg-neutral-800 rounded" />
                  <input type="datetime-local" value={formTime} onChange={(e)=>setFormTime(e.target.value)} className="flex-1 p-2 bg-neutral-800 rounded" />
                </div>

                <div className="flex gap-2">
                  <select value={formTable} onChange={(e)=>setFormTable(e.target.value)} className="flex-1 p-2 bg-neutral-800 rounded">
                    <option value="">Bez stola (slobodan)</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.id} - {t.seats} mesta</option>)}
                  </select>

                  <select value={formWaiterAssign} onChange={(e)=>setFormWaiterAssign(e.target.value)} className="w-48 p-2 bg-neutral-800 rounded" disabled={settings.aiAssignment}>
                    <option value="">AI Dodela (automatski)</option>
                    {waiters.filter(w => w.onShift).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (u smeni)
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={formSpecialRequests}
                  onChange={(e) => setFormSpecialRequests(e.target.value)}
                  placeholder="Posebni zahtevi (opciono)"
                  className="w-full p-2 bg-neutral-800 rounded"
                  rows="2"
                />

                {settings.aiAssignment && (
                  <div className="text-xs text-green-400 bg-green-900/30 p-2 rounded">
                    <FaRobot className="inline mr-1" />
                    AI će automatski dodeliti najboljeg dostupnog konobara
                  </div>
                )}

                {/* 2D table map (click to select table) */}
                <div className="mt-3 p-2 bg-neutral-800 rounded border border-neutral-700">
                  <div className="text-sm mb-2">Izaberite sto (klikom) — izabrani: {formTable || "nijedan"}</div>
                  <div className="relative h-48 bg-neutral-900 rounded">
                    {tables.map(t => (
                      <div key={t.id} onClick={() => setFormTable(t.id)} style={{ left: t.x / 2, top: t.y / 2, width: Math.max(60, t.w/2), height: Math.max(40, t.h/2) }} className={`absolute select-none flex items-center justify-center rounded cursor-pointer ${formTable === t.id ? "ring-2 ring-cyan-400 z-50 bg-cyan-900" : "bg-neutral-800"}`}>
                        <div className="text-xs">{t.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => { setShowAdd(false); }} className="px-3 py-2 rounded bg-gray-700">Otkaži</button>
                <button type="submit" className="px-3 py-2 rounded bg-green-600">Sačuvaj</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handover modal */}
      <AnimatePresence>
        {showHandover && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div initial={{scale:0.98}} animate={{scale:1}} exit={{scale:0.98}} className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-96">
              <h4 className="font-bold mb-3">Primopredaja smene</h4>
              <div className="mb-3 text-sm text-gray-300">Izaberite ko predaje i ko preuzima smenu.</div>

              <div className="flex gap-2 mb-3">
                <select value={handoverFrom || ""} onChange={(e)=>setHandoverFrom(e.target.value)} className="flex-1 p-2 bg-neutral-800 rounded">
                  <option value="">Ko predaje?</option>
                  {waiters.map(w => <option key={w.id} value={w.id}>{w.name} {w.onShift ? "(u smeni)" : ""}</option>)}
                </select>

                <select value={handoverTo || ""} onChange={(e)=>setHandoverTo(e.target.value)} className="flex-1 p-2 bg-neutral-800 rounded">
                  <option value="">Ko preuzima?</option>
                  {waiters.map(w => <option key={w.id} value={w.id}>{w.name} {w.onShift ? "(u smeni)" : ""}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowHandover(false)} className="px-3 py-2 rounded bg-gray-700">Otkaži</button>
                <button onClick={() => { performHandover(handoverFrom, handoverTo); }} className="px-3 py-2 rounded bg-green-600">Primopredaj</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiter detail modal */}
      <AnimatePresence>
        {showWaiterDetail && viewingWaiter && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{scale:0.98}} animate={{scale:1}} exit={{scale:0.98}} className="w-full max-w-2xl bg-gray-900 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">{viewingWaiter.name} — pregled rada</h4>
                <div className="flex gap-2">
                  <button onClick={() => { setShowWaiterDetail(false); setViewingWaiter(null); }} className="px-3 py-1 rounded bg-red-600">Zatvori</button>
                  <button onClick={() => exportWaiterCSV(viewingWaiter)} className="px-3 py-1 rounded bg-green-600"><FaDownload /> Export CSV</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-800 p-3 rounded">
                  <div className="text-xs text-gray-400">Ukupno rezervacija (svi meseci)</div>
                  <div className="text-2xl font-bold">{Object.values(viewingWaiter.stats || {}).reduce((acc,s)=>acc + (s.reservations || 0), 0)}</div>
                </div>
                <div className="bg-neutral-800 p-3 rounded">
                  <div className="text-xs text-gray-400">Ukupna naplata</div>
                  <div className="text-2xl font-bold">{Object.values(viewingWaiter.stats || {}).reduce((acc,s)=>acc + (s.revenue || 0), 0)} RSD</div>
                </div>
                <div className="col-span-2 bg-neutral-800 p-3 rounded">
                  <div className="text-xs text-gray-400 mb-1">Mesečni detalji</div>
                  <div className="space-y-2">
                    {Object.keys(viewingWaiter.stats || {}).length === 0 && <div className="text-sm text-gray-400">Nema podataka.</div>}
                    {Object.entries(viewingWaiter.stats || {}).map(([month, stat]) => (
                      <div key={month} className="flex justify-between text-sm">
                        <div>{month}</div>
                        <div>{stat.reservations} rezervacija • {stat.revenue || 0} RSD</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* --- Helper components below --- */

/* Simple SVG bar chart used in stats (no external deps) */
function SimpleBarChart({ data = [] }) {
  const width = 600; const height = 120; const padding = 20;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (width - padding * 2) / Math.max(1, data.length);
  return (
    <div className="overflow-auto">
      <svg width={Math.min(width, 900)} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <rect x="0" y="0" width={width} height={height} fill="rgba(255,255,255,0.02)" rx="8" />
        {data.map((d,i) => {
          const barHeight = (d.value / max) * (height - padding*2);
          const x = padding + i * barW + 4;
          const y = height - padding - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} rx="4" width={barW - 8} height={barHeight} fill="#2563eb" />
              <text x={x + (barW - 8)/2} y={height - padding + 12} fill="#9CA3AF" fontSize="10" textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Mini Calendar component (no external deps) */
function MiniCalendar({ monthDate, onDayClick, reservationsForDate }) {
  // build month grid
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = start.getDay(); // 0-6
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 0).getDate();
  const weeks = [];
  let dayCounter = 1 - startWeekDay;
  for (let week = 0; week < 6; week++) {
    const days = [];
    for (let d = 0; d < 7; d++, dayCounter++) {
      const cur = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayCounter);
      const inMonth = dayCounter >= 1 && dayCounter <= daysInMonth;
      days.push({ date: cur, inMonth });
    }
    weeks.push(days);
    if (dayCounter > daysInMonth) break;
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2">
        <div>Ne</div><div>Po</div><div>Ut</div><div>Sr</div><div>Čt</div><div>Pe</div><div>Su</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, idx) => {
          const dayRes = reservationsForDate(cell.date);
          return (
            <div key={idx} className={`p-2 rounded ${cell.inMonth ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900/50"} cursor-pointer transition-colors`} onClick={() => cell.inMonth && onDayClick(cell.date)}>
              <div className="flex items-center justify-between">
                <div className="text-sm">{cell.date.getDate()}</div>
                <div className="text-xs text-gray-400">{dayRes.length}</div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {dayRes.slice(0,3).map((r,i) => <div key={i} className="text-[10px] bg-indigo-700 px-1 rounded">{new Date(r.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>)}
                {dayRes.length > 3 && <div className="text-[10px] text-gray-400">+{dayRes.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

  