import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { useUser } from '../contexts/UserContext.tsx';

export default function ProfileMenu() {
    const { user } = useUser();
    
    if (!user) return null;
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 p-2 rounded-lg transition">
                <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full"
                />
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer">Profilo</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Impostazioni</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600">Esci</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}