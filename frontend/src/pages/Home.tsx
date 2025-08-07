import Header from "../components/Header.tsx";


const Home = () => {
  return (
    <div>
      <Header/>
      <main className='px-(--page-width)'>
        <div className='pt-7 flex justify-center'>
          <h1 className='text-white'>Select a focking server you imbecil</h1>
        </div>
      </main>
    </div>
  );
};

export default Home;