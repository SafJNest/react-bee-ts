import { Hash } from "lucide-react";

const Settings = () => {
  return (
    <div>
      <div className="w-full flex items-center p-[var(--discord-inner-spacing)] border-page-border border-b-1 border-r-1">
        <h2 className="text-white font-bold text-xl">                
          <div className="flex items-center gap-2">
            <Hash size={28} strokeWidth={1.5} />
              <span>
                  Settings
              </span>
            </div>
        </h2>
      </div>
      <div className="px-10">
        <div className="w-full rounded-2xl bg-dark">
          <div className="text-xl text-white font-bold p-10">
            <div className="text-sm">
              You can change the prefix used to trigger the bot.
            </div>
          </div>
          <div className="text-white">
            <input type="text" className="input" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;