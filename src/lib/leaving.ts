"use client";

// Pages with unsaved changes register here, so a deliberate full page load such as signing out can ask first.
// Once the user agrees, the tab is marked as leaving, and nothing may block or redirect that load.
const unsaved = new Set<object>();
let leaving = false;

export function trackUnsaved(token: object): () => void {
  unsaved.add(token);
  return () => {
    unsaved.delete(token);
  };
}

export const hasUnsavedChanges = () => unsaved.size > 0;
export const isLeaving = () => leaving;
export function setLeaving(value: boolean) {
  leaving = value;
}
