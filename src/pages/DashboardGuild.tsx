import Sidebar from "@/components/Sidebar";
import { useParams } from "react-router-dom";
import { Guild } from "@/types/Guild";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useGuild, GuildProvider  } from "@/contexts/GuildContext";
import {
  DiscordAccordion,
  DiscordAccordionTrigger,
  DiscordAccordionContent,
  DiscordContent,
} from "@/components/ui/DiscordAccordion";

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
        <main className="w-full">
          <div className="w-full h-full flex bg-dark-grey border-page-border border-1 rounded-tl-xl rounded-bl-xl">
            <div className="flex-[0_0_300px] overflow-scroll max-h-screen">
              <div className="w-full flex items-center p-[var(--discord-inner-spacing)] border-page-border border-b-1 border-r-1">
                <h2 className="text-white font-bold text-xl">{guild?.name}</h2>
              </div>
              <div className="w-full h-screen border-page-border border-b-1 border-r-1 pt-5 px-5">
                <ul>
                  <DiscordContent name="general" link={`/dashboard/${guildId}/general`} />
                  <DiscordAccordion>
                    <DiscordAccordionTrigger>Channels</DiscordAccordionTrigger>
                    <DiscordAccordionContent>
                      <DiscordContent name="settings" link={`/dashboard/${guildId}/settings`}  />
                    </DiscordAccordionContent>
                  </DiscordAccordion>
                </ul>
              </div>
            </div>
            <div className="flex-1 bg-light-grey">
              <Outlet />
            </div>
          </div>
        </main>
        {/* <main className='px-(--page-width)'>
          <div className='pt-7 flex justify-center'>
            <h1 className='text-white'>
              {guild ? `Welcome to ${guild.name}` : "Loading..."}
            </h1>
          </div>
          <ul className="w-64">
          <DiscordContent name="general" link="/general" />
          <DiscordAccordion>
              <DiscordAccordionTrigger>Channels</DiscordAccordionTrigger>
              <DiscordAccordionContent>
                  <DiscordContent name="general" link="/general" />
                  <DiscordContent name="announcements" link="/announcements" />
                  <DiscordContent name="bot-commands" link="/bot" />
              </DiscordAccordionContent>
          </DiscordAccordion>
          </ul>
        </main> */}
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
