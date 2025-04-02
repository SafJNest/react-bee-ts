import React, { useState, useEffect } from 'react';
import ProfileMenu from './ProfileMenu.tsx';
import { useUser } from './contexts/UserContext.tsx';

const Header: React.FC = () => {
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const { user } = useUser();

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    setIsSticky(scrollPosition > 0);
  };

  useEffect(() => {
    console.log(user)
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`mx-(--page-width) mt-5 py-5 px-10 sticky top-5 rounded-xl transition-all duration-300 ${isSticky ? 'bg-[#29292980] backdrop-blur-2xl' : 'bg-[#d18f52]'} z-2`}
    >
      <div className="flex justify-between items-center">
        <div className="text-white font-bold">Focking berbit guys</div>
        <nav>
          {user ? <ProfileMenu /> : <LoginButton />}
        </nav>
      </div>
    </header>
  );
};

const LoginButton = () => (
  <a
    href="https://discord.com/oauth2/authorize?client_id=938487470339801169&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fdiscord&scope=guilds+identify"
    className="bg-dark-blurple text-white rounded-xl px-7 py-3 inline-block"
  >
    Login
  </a>
);

export default Header;
