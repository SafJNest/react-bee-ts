import Header from './Header.tsx';
import HexagonalCard from './components/HexagonalCard.tsx';
import { HexGrid, Layout, Hexagon, Text, Pattern, Path, Hex } from 'react-hexgrid';


const Home = () => {
  return (
    <div>
      <Header/>
      <div className='pt-7 flex justify-center'>
        <h1 className='font-bold text-white text-[30px]'>Select a focking server you imbecil</h1>
      </div>
      <div className='px-50 py-10 hex-grid__list'>
        {[...Array(10)].map((x, i) =>
          <HexagonalCard/>
        )}
      </div>
    </div>
  );
};

export default Home;