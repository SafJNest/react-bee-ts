import { useEffect, useState } from "react";
import { Guild } from "@/types/Guild";
import { NavLink } from "react-router-dom";

const Icon = ({ guild }: { guild: Guild }) => {
    const isGif = guild.icon?.startsWith('a_');
    const guildImage = guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${isGif ? "gif" : "png"}`
        : '';

    return (
        <NavLink 
            key={guild.id} 
            to={'/dashboard/' + guild.id} 
            className={({ isActive }) => `
                relative flex items-center group
                ${isActive ? '[&_.indicator]:h-full [&_.indicator]:scale-100' : 'rounded-[50%]'}
                transition-all duration-200
            `}
        >
            <div className="indicator absolute -left-9 w-3 bg-white rounded-r-full transition-all duration-200
                h-[20px] scale-0 group-hover:h-[50%] group-hover:scale-100" 
            />
            {guild.icon ? (
                <img
                    className="w-full h-full object-cover rounded-[15px]"
                    src={guildImage}
                    alt={guild.name}
                />
            ) : (
                <div className="w-full h-full flex justify-center items-center text-white 
                    border-white border-2 text-lg font-bold rounded-[15px]">
                    {guild.name.split(/[ -]/).map(word => word.charAt(0)).join('')}
                </div>
            )}
        </NavLink>
    );
};

const Sidebar = () => {
    const [guilds, setGuilds] = useState<Guild[]>([]);

    useEffect(() => {
        const rawGuilds = localStorage.getItem("guilds");
        if (!rawGuilds) 
            return; // TODO: Handle missing data case
        
        const parsedGuilds = JSON.parse(rawGuilds) as Guild[];
        setGuilds(parsedGuilds);
    }, []);

    return (
        <div className="flex flex-col justify-start gap-10">
            {guilds.map((guild) => (
                <Icon guild={guild} />
            ))}
        </div>
    );
};

export default Sidebar;