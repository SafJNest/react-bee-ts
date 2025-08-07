import React from "react";
import type { Guild } from '../types/Guild.ts';
import { Link } from "react-router-dom";


const HexagonalCard: React.FC<{ guild: Guild }> = ({ guild }) => {
    const isGif = guild.icon?.startsWith("a_");

    const guildImage = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${isGif ? "gif" : "jpg"}`;
    const guildImageJpg = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`;

    return (
        <li className="hex-grid__item">
            <div className="hex-grid__content bg-dark-grey flex flex-col justify-between">
              
                <div 
                    className="flex-[0_0_calc(100%/3)] relative opacity-[71.1%]" 
                    style={{  
                        backgroundImage: guild.icon && `url(${guildImageJpg})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat'
                    }}
                >

                    <div className="absolute top-0 right-0 left-0 bottom-0 z-2 backdrop-blur-[10px]">
                        <div className="flex items-center justify-center h-full">
                            {guild.icon ?
                                <img 
                                    className="w-[25%] object-cover rounded-full"
                                    src={guildImage}
                                    alt={guild.name} 
                                />
                                :
                                <div className="w-[25%] aspect-[1/1] flex justify-center items-center text-white border-white border-2 text-2xl font-bold rounded-full">
                                    {guild.name.split(/[ -]/).map(word => word.charAt(0)).join('')}
                                </div>
                            }
                        </div>
                    </div>
                </div>    

                <div className="p-9 flex justify-center items-center flex-[0_0_calc(100%/3)] z-3 bg-dark-grey">
                    <p className="text-white font-bold line-clamp-2">{guild.name}</p>
                </div>

                <div className="w-full flex-[0_0_calc(100%/3)] flex items-center justify-center">
                    <Link to={'/dashboard/' + guild.id} className="bg-[#d18f52] hover:bg-dark-blurple w-[100%] h-[100%] inset-0 flex justify-center items-center text-white font-bold">
                        Click Me
                    </Link>
                </div>
            </div>
        </li>
    );
};

const HexagonalCardSkeleton: React.FC = () => {
    return (
        <li className="hex-grid__item animate-pulse">
            <div className="hex-grid__content bg-[#d18f52]">

            </div>
        </li>
    );
};

export { HexagonalCard, HexagonalCardSkeleton };
export default HexagonalCard;
