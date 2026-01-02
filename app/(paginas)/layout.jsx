import NavBarHorizontal from '@/components/Navegacion/NavBarHorizontal'

export default async function Layout({ children }) {
  return (
    <div className={`flex flex-col w-screen h-screen overflow-auto pb-2`}>
      <div id="modalUnico" hidden={true} className='fixed top-0 left-0 w-screen h-screen bg-black' style={{zIndex:9999}}>
        nada
      </div>
      <NavBarHorizontal />
      <div className={`
      flex flex-col
      w-screen max-w-screen
        h-screen max-h-screen
        px-4 mx-auto
        hideScroll
        `} >
          {children}
      </div>
    </div>
  );
}