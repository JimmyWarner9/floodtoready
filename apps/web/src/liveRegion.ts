import { createContext, useContext } from "react";

export interface LiveRegionApi {
  announcePolite(message: string): void;
  announceAssertive(message: string): void;
}

export const LiveRegionContext = createContext<LiveRegionApi | null>(null);

/** Allows feature components to announce updates through the shell's shared regions. */
export function useLiveRegion(): LiveRegionApi {
  const context = useContext(LiveRegionContext);

  if (context === null) {
    throw new Error("useLiveRegion must be used within AppShell");
  }

  return context;
}
