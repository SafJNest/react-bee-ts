import Sidebar from "@/components/Sidebar";
import { useParams } from "react-router-dom";


const DashboardGuild = () => {
    const { guildId } = useParams<{ guildId: string }>();
    return (
        <div className="flex">
            <div className="flex-[0_0_70px] overflow-scroll max-h-screen bg-dark-grey p-9">
                <Sidebar />
            </div>
            <main className='px-(--page-width)'>
                <div className='pt-7 flex justify-center'>
                    <h1 className='text-white'>welcome to {guildId}</h1>
                </div>
            </main>
        </div>
    );
};

export default DashboardGuild;