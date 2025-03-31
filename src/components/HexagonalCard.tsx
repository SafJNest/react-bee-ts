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
                <div className="h-[40%] relative">
                    <div className="absolute top-0 right-0 left-0 bottom-0 z-2">
                        <div className="flex items-center justify-center h-full">
                            <img 
                                className="w-[25%] object-cover rounded-full"
                                src={dioCaneDiGif}
                                alt="" 
                            />
                        </div>
                    </div>
                    <img 
                        className="w-full h-[100%] object-cover blur-[11.7px] opacity-[71.1%]"
                        src={dioCaneDiImg}
                        alt="" 
                    />
                </div>    
                <div className="p-9 flex justify-center items-center h-[35%] z-3 bg-dark-grey">
                    <p className="text-white font-bold line-clamp-2">Alveare dei focking safj</p>
                </div>
                <div className="w-full h-[25%] flex items-center justify-center">
                    <a className="bg-blurple hover:bg-dark-blurple w-[100%] h-[100%] inset-0 flex justify-center items-center text-white font-bold">
                        Click Me
                    </a>
                </div>
            </div>
        </li>
    );
};

export default HexagonalCard;
