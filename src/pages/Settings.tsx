import { Hash } from "lucide-react";

const Settings = () => {
  return (
    <div>
      <div className="w-full flex items-center p-[var(--discord-inner-spacing)] border-page-border border-b-1 border-r-1">
        <h2 className="text-white font-bold text-xl">                
          <div className="flex items-center gap-2">
            <Hash size={28} strokeWidth={1.5} /> //color-mix(in oklab, hsl(220 calc(1*4.918%) 88.039% /1) 100%, #000 0%)
              <span>
                  Settings
              </span>
            </div>
        </h2>
      </div>
    </div>
  );
};

export default Settings;