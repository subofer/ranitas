"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

const VisionStatusContext = createContext(null);

export function VisionStatusProvider({
  children,
  autoRefresh = true,
  refreshInterval = 5000,
}) {
  const [loadedModels, setLoadedModels] = useState([]);
  const [modelStatuses, setModelStatuses] = useState({});
  const previousLoadedRef = useRef([]);
  const intervalRef = useRef(null);
  const [currentPollingInterval, setCurrentPollingInterval] =
    useState(refreshInterval);

  const [probeState, setProbeState] = useState("waiting");
  const previousProbeStateRef = useRef("waiting");

  const setProbeStateIfChanged = useCallback((newState) => {
    if (previousProbeStateRef.current !== newState) {
      previousProbeStateRef.current = newState;
      setProbeState(newState);
    }
  }, []);
  const [statusInfo, setStatusInfo] = useState(null);
  const [dockerServices, setDockerServices] = useState({ ia: null, db: null });

  const checkStatus = useCallback(async () => {
    try {
      // Query server-side status endpoint `/api/ai/status` (server talks to docker/vision service)
      let res = null;
      try {
        res = await fetch("/api/ai/status", {
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) {
        res = null;
      }

      if (!res) {
        setProbeStateIfChanged("error");
        return { ok: false, hasUnloaded: false };
      }

      // Attempt to parse body even if status is non-2xx; server may return partial debug info in body
      const data = await (async () => {
        try {
          return await res.json();
        } catch (e) {
          return null;
        }
      })();
      if (!data) {
        setProbeStateIfChanged("error");
        return { ok: false, hasUnloaded: false };
      }

      // Trust the service payload as authoritative. Expose explicit docker service info (ia and db)
      // The server response puts runtime details inside `data.status` (see /api/ai/status)
      const statusPayload = data?.status || {};
      const si = {
        ...statusPayload,
        source:
          statusPayload.service === "vision-ai" || data?.service === "vision-ai"
            ? "vision-ai"
            : "proxy",
      };

      // Heuristic fallback: if the server included a `ps_raw` list but didn't set container_running,
      // aggregate any PS output we can find and try to detect common container names (ranitas-vision, postgres)
      try {
        let psAggregate = "";
        if (si && typeof si.container?.ps_raw === "string")
          psAggregate += si.container.ps_raw + "\n";
        if (si && typeof si.container?.db?.ps_raw === "string")
          psAggregate += si.container.db.ps_raw + "\n";
        if (si && typeof si.db?.ps_raw === "string")
          psAggregate += si.db.ps_raw + "\n";

        if (psAggregate) {
          if (
            si &&
            si.container &&
            !si.container.container_running &&
            psAggregate.includes("ranitas-vision")
          ) {
            si.container.container_running = true;
            si.container.name = si.container.name || "ranitas-vision";
            if (psAggregate.includes("(healthy)"))
              si.container.health = si.container.health || "healthy";
          }

          if (
            si &&
            si.db &&
            !si.db.container_running &&
            /postgres|postgres:|postgresql|pg/i.test(psAggregate)
          ) {
            si.db.container_running = true;
            si.db.name =
              si.db.name ||
              si.db.container_candidate ||
              psAggregate.match(/\b(\S+)\s+ranitas-postgres-\S+/)?.[1] ||
              "postgres";
            if (psAggregate.includes("(healthy)"))
              si.db.health = si.db.health || "healthy";
          }
        }
      } catch (heurErr) {
        /* ignore heuristics errors */
      }

      setStatusInfo(si);
      setProbeStateIfChanged("ok");

      // Build loaded models only from explicit sources: data.loadedModels or named subsystem fields with model/models
      const newLoadedModels = [];
      if (Array.isArray(data.loadedModels) && data.loadedModels.length > 0) {
        for (const m of data.loadedModels)
          newLoadedModels.push(
            typeof m === "string"
              ? { name: m, loaded: true }
              : { name: m.name || String(m), loaded: true },
          );
      } else {
        // collect from known subsystems without inventing names
        const subsystemKeys = ["yolo", "ollama"];
        for (const key of subsystemKeys) {
          const val = statusPayload[key] || data[key];
          if (val && Array.isArray(val.models) && val.models.length > 0) {
            for (const m of val.models)
              newLoadedModels.push({ name: m, loaded: true });
          } else if (val && typeof val.model === "string") {
            newLoadedModels.push({ name: val.model, loaded: true });
          } else if (val && typeof val.model_name === "string") {
            newLoadedModels.push({ name: val.model_name, loaded: true });
          }
        }
      }

      setLoadedModels(newLoadedModels);

      // Adjust polling interval based on LLM loading state
      const llmService = statusPayload?.services?.find(
        (s) => s.name === "ollama",
      );
      const isLlmLoading = llmService && !llmService.ready;
      const newInterval = isLlmLoading ? 1000 : refreshInterval; // 1 second when loading, normal interval otherwise
      if (newInterval !== currentPollingInterval) {
        setCurrentPollingInterval(newInterval);
      }

      // Keep docker-specific info grouped for easy consumption by UI
      // Prefer the post-processed `si` which may include heuristics derived from ps_raw
      const dockerServices = {
        ia:
          si?.container ||
          si?.vision ||
          statusPayload?.container ||
          data?.container ||
          null,
        // Prefer the container-scoped db info (status.container.db) if present, then fall back to other fields
        db:
          (statusPayload?.container && statusPayload.container.db) ||
          si?.db ||
          si?.postgres ||
          statusPayload?.db ||
          data?.db ||
          null,
      };
      setDockerServices(dockerServices);

      // Emit compact event
      try {
        if (typeof window !== "undefined" && window.dispatchEvent)
          window.dispatchEvent(
            new CustomEvent("docker-status", {
              detail: {
                loadedModels: newLoadedModels,
                dockerServices,
                statusInfo: si,
              },
            }),
          );
      } catch (e) {}

      // Compute model statuses
      const statuses = {};
      const names = new Set(newLoadedModels.map((m) => m.name));
      newLoadedModels.forEach((m) => {
        statuses[m.name] = "loaded";
      });
      previousLoadedRef.current.forEach((m) => {
        if (!names.has(m.name)) statuses[m.name] = "unloaded";
      });
      setModelStatuses(statuses);
      previousLoadedRef.current = newLoadedModels;

      return {
        ok: true,
        hasUnloaded: Object.values(statuses).some((s) => s === "unloaded"),
      };
    } catch (error) {
      console.warn("Docker checkStatus error:", error);
      setProbeStateIfChanged("error");
      return { ok: false, hasUnloaded: false };
    }
  }, [currentPollingInterval, refreshInterval]);

  // Polling/SSE simplified: prefer adaptive polling
  useEffect(() => {
    let polling = null;
    const start = async () => {
      await checkStatus();
      polling = setInterval(checkStatus, currentPollingInterval);
    };
    start();
    return () => {
      if (polling) clearInterval(polling);
    };
  }, [checkStatus, currentPollingInterval]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__visionRefresh = checkStatus;
      window.__getVisionModelStatus = () => ({
        loadedModels: [...loadedModels],
        statusInfo,
        probeState,
        modelStatuses,
      });
    }
  }, [checkStatus, loadedModels, statusInfo, probeState, modelStatuses]);

  const getModelStatus = useCallback(
    (modelName) =>
      modelName ? modelStatuses[modelName] || "unloaded" : "unloaded",
    [modelStatuses],
  );

  const setPollingInterval = (newInterval) => {
    setCurrentPollingInterval(newInterval);
  };

  // Control API to manage docker services (ia / db)
  const controlService = useCallback(
    async (action, target = "vision") => {
      try {
        const resp = await fetch("/api/ai/vision-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, target }),
        });
        const json = await resp
          .json()
          .catch(() => ({ ok: false, error: "invalid json" }));
        if (!resp.ok) throw new Error(json?.error || "control failed");
        // refresh state after action
        try {
          await checkStatus();
        } catch (e) {}
        return { ok: true, data: json };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
    [checkStatus],
  );

  const startService = (target) => controlService("start", target);
  const stopService = (target) => controlService("stop", target);
  const restartService = (target) => controlService("restart", target);
  const logsService = (target) => controlService("logs", target);

  const getServiceInfo = (target) =>
    target === "db" ? dockerServices.db : dockerServices.ia;

  const value = {
    loadedModels,
    modelStatuses,
    getModelStatus,
    refresh: checkStatus,
    setPollingInterval,
    probeState,
    statusInfo,
    dockerServices,
    getServiceInfo,
    controlService,
    startService,
    stopService,
    restartService,
    logsService,
  };

  return (
    <VisionStatusContext.Provider value={value}>
      {children}
    </VisionStatusContext.Provider>
  );
}

export function useVisionStatusContext() {
  const context = useContext(VisionStatusContext);
  if (!context)
    throw new Error(
      "useVisionStatusContext debe usarse dentro de VisionStatusProvider",
    );
  return context;
}
