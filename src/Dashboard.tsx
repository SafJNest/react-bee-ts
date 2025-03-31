import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Header from "./Header.tsx";
import { useUser } from "./contexts/UserContext.tsx";

type User = {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
};

const Dashboard: React.FC = () => {
    const { user, setUser } = useUser();
    const location = useLocation();

    useEffect(() => {
        if (user) return;

        const fetchUser = async () => {
            try {
                const response = await axios.get<User>("http://localhost:3001/discord/me", {
                    withCredentials: true,
                });
                setUser(response.data);
            } catch (error) {
                console.error("Errore nel fetch:", error);
            }
        };

        fetchUser();
    }, [location, user, setUser]);

    return (
        <div>
            <Header />
            <div className="h-2000">
                <h1>Dashboard</h1>
                {user ? (
                    <div>
                        <img
                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full"
                        />
                        <p>Benvenuto, {user.username}#{user.discriminator}!</p>
                    </div>
                ) : (
                    <p>Caricamento...</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
