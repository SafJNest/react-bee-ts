import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    FC,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";


interface AccordionContextType {
    isOpen: boolean;
    toggle: () => void;
}
const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

const useDiscordAccordion = () => {
    const context = useContext(AccordionContext);
    if (!context) throw new Error("useDiscordAccordion must be used within a DiscordAccordion");
    return context;
};


const DiscordAccordion: FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(true);
    const toggle = () => setIsOpen(prev => !prev);

    return (
        <AccordionContext.Provider value={{ isOpen, toggle }}>
            <li className="w-full text-white pt-10">{children}</li>
        </AccordionContext.Provider>
    );
};


const DiscordAccordionTrigger: FC<{ children: ReactNode }> = ({ children }) => {
    const { isOpen, toggle } = useDiscordAccordion();

    return (
        <div
            className="flex items-center gap-2 cursor-pointer hover:bg-[#2f3136] transition-colors"
            onClick={toggle}
        >
            <span className="uppercase text-[16px] text-gray-300">
                {children}
            </span>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
    );
};


const DiscordAccordionContent: FC<{ children: ReactNode }> = ({ children }) => {
    const { isOpen } = useDiscordAccordion();

    return (
        <nav
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
            <ul>{children}</ul>
        </nav>
    );
};

const DiscordContent: FC<{ name: string; link: string }> = ({ name, link }) => {
    return (
        <li>
            <NavLink
                to={link}
                className={({ isActive }) =>
                    `block text-sm transition-colors text-[16px] ${
                        isActive ? "bg-[#5865f2] text-white" : "text-gray-300 hover:bg-[#40444b]"
                    }`
                }
            >
                # {name}
            </NavLink>
        </li>
    );
};

export {
    DiscordAccordion,
    DiscordAccordionTrigger,
    DiscordAccordionContent,
    DiscordContent,
};
