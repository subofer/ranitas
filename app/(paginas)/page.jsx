import Link from "next/link"

export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
    return (
    <main className='
      flex
      flex-col
    '>
      <span>
        Inicio?
      </span>
      <Link href={"/productos"}>Ir a productos</Link>
    </main>
  )
}
