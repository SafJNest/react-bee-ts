import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Guild } from "../types/Guild";

type GuildContextType = {
  guild: Guild | null;
  setGuild: React.Dispatch<React.SetStateAction<Guild | null>>;
};

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export const GuildProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [guild, setGuild] = useState<Guild | null>(() => {
    const cachedGuild = localStorage.getItem("guild");
    return cachedGuild ? JSON.parse(cachedGuild) : null;
  });

  useEffect(() => {
    if (!guild) return;

    localStorage.setItem("guild", JSON.stringify(guild));
  }, [guild]);

  return (
    <GuildContext.Provider value={{ guild, setGuild }}>
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error("useGuild must be used within a GuildProvider");
  }
  return context;
};
