import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header.tsx";
import { useUser } from "../contexts/UserContext.tsx";
import { HexagonalCard, HexagonalCardSkeleton } from '../components/HexagonalCard.tsx';
import type { Guild } from '../types/Guild.ts';

const Dashboard: React.FC = () => {
    const { user } = useUser();
    const [guilds, setGuilds] = useState<Guild[] | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchGuilds = async () => {
            try {
                const response = await axios.get<Guild[]>("http://localhost:3001/beebot/guilds", {
                    withCredentials: true,
                });
                console.log("Fetched guilds:", response.data);
                localStorage.setItem("guilds", JSON.stringify(response.data));
                const sortedGuilds = response.data.sort((a, b) => a.name.localeCompare(b.name));
                setGuilds(sortedGuilds);
            } catch (error) {
                console.error("Errore nel fetch:", error);
            }
        };

        fetchGuilds();
    }, [user]);

    return (
        <div>
            <Header />
            <main className='px-(--page-width)'>
                <h1>Dashboard</h1>
                {user ? (
                    <div>
                        <img
                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full"
                        />
                        <p>Benvenuto, {user.username}!</p>
                        
                        <ul className="py-10 hex-grid__list">
                            {guilds ? (
                                guilds.map((guild) => <HexagonalCard key={guild.id} guild={guild} />)
                            ) : (
                                [...Array(10)].map((_, i) => <HexagonalCardSkeleton key={i} />)
                            )}
                        </ul>
                    </div>
                ) : (
                    <p>Caricamento utente...</p>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
