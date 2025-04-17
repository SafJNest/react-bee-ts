import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import axios from "axios";
import { User } from '@/types/User';
import Cookies from 'js-cookie';

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
    if (user) {
      localStorage.removeItem('user');
      return;
    }

    const fetchUser = async () => {
        try {
            const response = await axios.get<User>("http://localhost:3001/discord/me", {
                withCredentials: true,
            });
            console.log("Fetched user:", response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
            setUser(response.data);
        } catch (error) {
            console.error("Errore nel fetch:", error);
        }
    };

    fetchUser();
  }, [user]);

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