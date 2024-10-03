"use client"
const DolarHoy = ({valores}) => {
  return (
    <table>
      <tbody>
        {valores?.keys?.map((t, i) => <tr key={"tr" + i }>
          <th>{t}</th>
          <td>{valores[t].compra}</td>
          <td >{valores[t].venta}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default DolarHoy;