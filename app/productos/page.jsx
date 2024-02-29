import { CargaProducto } from '../components/productos/CargaProducto'
import ListadoProductos from '../components/productos/ListadoProductos'
import styles from './page.module.css'


export default function Home() {
  const fecha = new Date().toISOString().split('T')[0]
  return (
    <main className={styles.main}>
      Hola productos!
      <div className={styles.center}>
      </div>
      <CargaProducto/>
      <ListadoProductos />
     
    </main>
  )
}
