export const metadata = {
  title: 'Gestion Productos',
  description: 'Gestion de productos',
}

export default function Layout({ children }) {
  return (
    <div className={`flex flex-col w-screen h-screen overflow-auto pb-2`}>
      <div
        className={`
        flex flex-col
        w-screen max-w-screen
          h-screen max-h-screen
          px-4 mx-auto
          hideScroll
          `}
      >
        {children}
      </div>
    </div>
  )
}
