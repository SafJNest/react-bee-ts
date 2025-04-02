import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";
import Cookies from 'js-cookie';

type User = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });

  useEffect(() => {
    const discordToken = Cookies.get('discord_token')
    console.log(discordToken)
    if (!discordToken || user) return

      const fetchUser = async () => {
          try {
              const response = await axios.get<User>("http://localhost:3001/discord/me", {
                  withCredentials: true,
              });
              localStorage.setItem('user', JSON.stringify(response.data))
              setUser(response.data);
          } catch (error) {
              console.error("Errore nel fetch:", error);
          }
      };

      fetchUser();
  })

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};