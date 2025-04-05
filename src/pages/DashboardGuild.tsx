import Sidebar from "@/components/Sidebar";
import { useParams } from "react-router-dom";
import { Guild } from "@/types/Guild";
import { useEffect } from "react";
import { useGuild, GuildProvider  } from "@/contexts/GuildContext";

const DashboardGuild = () => {
  const { guildId } = useParams<{ guildId: string }>();
  const { guild, setGuild } = useGuild();

  useEffect(() => {
    const rawGuilds = localStorage.getItem("guilds");
    if (!rawGuilds || !guildId) return;

    const parsedGuilds = JSON.parse(rawGuilds) as Guild[];
    const matched = parsedGuilds.find(g => g.id === guildId);

    if (!matched) {
        console.error("Guild not found in local storage:", guildId);
        return;
    }
    setGuild(matched);
  }, [guildId]);

  return ( 
    <div>
      <DashboardGuildTitle />
      <div className="flex">
        <div className="flex-[0_0_70px] overflow-scroll max-h-screen bg-dark-grey p-9">
          <Sidebar />
        </div>
        <main className='px-(--page-width)'>
          <div className='pt-7 flex justify-center'>
            <h1 className='text-white'>
              {guild ? `Welcome to ${guild.name}` : "Loading..."}
            </h1>
          </div>
        </main>
      </div>
    </div>
  );
};

const DashboardGuildTitle = () => {
    const { guild } = useGuild();
    if (!guild) 
        return null;

    const isGif = guild.icon?.startsWith('a_');
    const guildImage = guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${isGif ? "gif" : "png"}`
        : '';

    return (
      <div className="bg-dark-grey w-full flex justify-center">
        <div className="flex items-center gap-5 py-5">
            <img
                className="w-12 h-12 object-cover rounded-[5px]"
                src={guildImage}
                alt={guild.name}
            />
            <h1 className='text-white text-[14px]'>
                {guild.name}
            </h1>
        </div>
      </div>
    );

}

const DashboardGuildWrapper = () => {
    return (
      <GuildProvider>
        <DashboardGuild />
      </GuildProvider>
    );
};

export default DashboardGuildWrapper;
