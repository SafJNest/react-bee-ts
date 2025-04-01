import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

type Guild = {
    id: string;
    name: string;
    image: string;
};

const dioCaneDiGif = "https://cdn.discordapp.com/icons/474935164451946506/a_431a2da25fec16a065b6fe0325475ba6.gif";
const dioCaneDiImg = "https://cdn.discordapp.com/icons/474935164451946506/a_431a2da25fec16a065b6fe0325475ba6.jpg";

const HexagonalCard: React.FC = () => {
    return (
        <li className="hex-grid__item">
            <div className="hex-grid__content bg-dark-grey flex flex-col justify-between">
                <div className="flex-[0_0_calc(100%/3)] relative  opacity-[71.1%]" style={{  
                                        backgroundImage: "url(" + dioCaneDiImg + ")",
                                        backgroundPosition: 'center',
                                        backgroundSize: 'cover',
                                        backgroundRepeat: 'no-repeat'
                                        }}>
                    <div className="absolute top-0 right-0 left-0 bottom-0 z-2 backdrop-blur-[10px]">
                        <div className="flex items-center justify-center h-full">
                            <img 
                                className="w-[25%] object-cover rounded-full"
                                src={dioCaneDiGif}
                                alt="" 
                            />
                        </div>
                    </div>
                </div>    
                <div className="p-9 flex justify-center items-center flex-[0_0_calc(100%/3)] z-3 bg-dark-grey">
                    <p className="text-white font-bold line-clamp-2">Alveare dei focking safj</p>
                </div>
                <div className="w-full flex-[0_0_calc(100%/3)] flex items-center justify-center">
                    <a className="bg-blurple hover:bg-dark-blurple w-[100%] h-[100%] inset-0 flex justify-center items-center text-white font-bold">
                        Click Me
                    </a>
                </div>
            </div>
        </li>
    );
};

export default HexagonalCard;
