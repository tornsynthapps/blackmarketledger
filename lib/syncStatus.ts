"use client";

import { useSyncExternalStore } from "react";

export interface GlobalSyncStatus {
  isSyncing: boolean;
  message: string;
}

let currentStatus: GlobalSyncStatus = {
  isSyncing: false,
  message: "",
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setGlobalSyncStatus(status: GlobalSyncStatus) {
  currentStatus = status;
  emitChange();
}

export function getGlobalSyncStatus() {
  return currentStatus;
}

export function subscribeToGlobalSyncStatus(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGlobalSyncStatus() {
  return useSyncExternalStore(
    subscribeToGlobalSyncStatus,
    getGlobalSyncStatus,
    getGlobalSyncStatus,
  );
}
