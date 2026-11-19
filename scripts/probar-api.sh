#!/usr/bin/env bash
# Pruebas de la API (lista de control 10.8) contra un servidor en marcha.
# Uso:  bash scripts/probar-api.sh                (http://localhost:3000)
#       bash scripts/probar-api.sh http://localhost:3100
# OJO: crea datos de prueba (producto TEST-1, "Cliente Prueba"...). Usar con la base LOCAL.
# Para volver a los datos iniciales: borrar local.db y correr db:migrate y db:seed.
B=${1:-http://localhost:3000}
D=$(mktemp -d)
A="$D/admin.txt"; V="$D/vend.txt"

pedir() { # metodo url cookiejar [json]
  if [ -n "$4" ]; then
    curl -s -o "$D/r.json" -w "%{http_code}" -X "$1" -b "$3" -c "$3" -H "Content-Type: application/json" --data "$4" "$B$2"
  else
    curl -s -o "$D/r.json" -w "%{http_code}" -X "$1" -b "$3" -c "$3" "$B$2"
  fi
}
codigo() { node -e 'const r=require(process.argv[1]);console.log(r.error?r.error.code:"")' "$D/r.json"; }
campo() { node -e 'const r=require(process.argv[1]);console.log(eval("r."+process.argv[2]))' "$D/r.json" "$1"; }
check() { # nombre esperado obtenido
  if [ "$2" == "$3" ]; then echo "OK   $1 ($3)"; else echo "FALLA $1: esperado $2, obtenido $3 $(cat $D/r.json | head -c 300)"; fi
}

touch "$D/nada.txt"
s=$(pedir GET /api/productos "$D/nada.txt"); check "Sin sesión -> 401" 401 "$s"
s=$(pedir POST /api/auth/login "$D/nada.txt" '{"email":"laura@ferreteria.test","password":"mal"}'); check "Login incorrecto -> 401" 401 "$s"
s=$(pedir POST /api/auth/login "$A" '{"email":"laura@ferreteria.test","password":"admin1234"}'); check "Login admin" 200 "$s"
s=$(pedir POST /api/auth/login "$V" '{"email":"pablo@ferreteria.test","password":"vendedor1234"}'); check "Login vendedor" 200 "$s"
s=$(pedir GET /api/auth/me "$V"); check "me vendedor" 200 "$s"

s=$(pedir POST /api/productos "$V" '{"codigo":"X-1","descripcion":"x","categoriaId":1,"precio":100,"stockMinimo":0}'); check "Vendedor crea producto -> 403" 403 "$s"
s=$(pedir GET /api/usuarios "$V"); check "Vendedor lista usuarios -> 403" 403 "$s"
s=$(pedir POST /api/productos "$A" 'esto no es json'); check "JSON inválido -> 400" 400 "$s"
s=$(pedir POST /api/productos "$A" '{"codigo":"HE-001","descripcion":"x","categoriaId":1,"precio":100,"stockMinimo":0}'); check "Código duplicado -> 409" 409 "$s"
s=$(pedir POST /api/productos "$A" '{"codigo":"","precio":-1}'); check "Validación -> 422" 422 "$s"
s=$(pedir PATCH /api/productos/1 "$A" '{"existencia":999}'); check "PATCH existencia -> 422" 422 "$s"

# Producto nuevo con 1 unidad para probar la concurrencia
s=$(pedir POST /api/productos "$A" '{"codigo":"TEST-1","descripcion":"Producto de prueba","categoriaId":1,"precio":150000,"stockMinimo":0,"stockInicial":1}'); check "Alta producto con stock inicial" 201 "$s"
P=$(campo id)
s=$(pedir GET "/api/productos/$P/movimientos" "$A"); check "Movimiento stock inicial" 1 "$(campo total)"

s=$(pedir POST /api/productos/$P/movimientos "$A" '{"tipo":"egreso","cantidad":5,"motivo":"Rotura"}'); check "Egreso que deja negativo -> 409" 409 "$s"

# Dos ventas simultáneas de la última unidad
cuerpo="{\"clienteId\":null,\"items\":[{\"productoId\":$P,\"cantidad\":1}],\"pago\":{\"forma\":\"contado\"}}"
curl -s -o "$D/c1.json" -w "%{http_code}\n" -b "$A" -H "Content-Type: application/json" --data "$cuerpo" "$B/api/facturas" > "$D/s1" &
curl -s -o "$D/c2.json" -w "%{http_code}\n" -b "$V" -H "Content-Type: application/json" --data "$cuerpo" "$B/api/facturas" > "$D/s2" &
wait
echo "     Ventas simultáneas: $(cat $D/s1) y $(cat $D/s2) (debe ser un 201 y un 409)"
s=$(pedir GET /api/productos/$P "$A"); check "Existencia final 0" 0 "$(campo existencia)"

s=$(pedir POST /api/facturas "$V" '{"clienteId":null,"items":[{"productoId":2,"cantidad":1}],"pago":{"forma":"cuenta_corriente"}}'); check "Consumidor final en cta cte -> 422" "CUENTA_CORRIENTE_NO_HABILITADA" "$(codigo)"
s=$(pedir POST /api/facturas "$V" '{"clienteId":null,"items":[{"productoId":2,"cantidad":1}],"pago":{"forma":"tarjeta","tarjeta":{"tipo":"debito","marca":"Visa","ultimos4":"1234","numero":"4111111111111111"}}}'); check "Número completo de tarjeta -> 422" 422 "$s"
s=$(pedir POST /api/facturas "$V" '{"clienteId":null,"items":[{"productoId":2,"cantidad":1}],"pago":{"forma":"contado","montoRecibido":1}}'); check "Monto insuficiente" "MONTO_INSUFICIENTE" "$(codigo)"
s=$(pedir POST /api/facturas "$V" '{"clienteId":null,"items":[{"productoId":2,"cantidad":99999}],"pago":{"forma":"contado"}}'); check "Stock insuficiente" "STOCK_INSUFICIENTE" "$(codigo)"
s=$(pedir POST /api/facturas "$V" '{"clienteId":null,"items":[{"productoId":2,"cantidad":1},{"productoId":2,"cantidad":1}],"pago":{"forma":"contado"}}'); check "Productos repetidos -> 422" 422 "$s"

# Cliente nuevo en cuenta corriente, venta, pago y anulación
s=$(pedir POST /api/clientes "$V" '{"tipoDoc":"DNI","nroDoc":"44.555.666","nombre":"Cliente Prueba","cuentaCorriente":true,"limiteCredito":10000000}'); check "Alta cliente" 201 "$s"
C=$(campo id)
s=$(pedir POST /api/clientes "$V" '{"tipoDoc":"DNI","nroDoc":"44555666","nombre":"Otro"}'); check "Documento duplicado (sin puntos) -> 409" 409 "$s"
s=$(pedir GET /api/productos/2 "$A"); E0=$(campo existencia); PR=$(campo precio)
s=$(pedir POST /api/facturas "$V" "{\"clienteId\":$C,\"items\":[{\"productoId\":2,\"cantidad\":2}],\"pago\":{\"forma\":\"cuenta_corriente\"}}"); check "Venta en cta cte" 201 "$s"
F=$(campo id); check "Saldo cliente = total" "$((PR*2))" "$(campo saldoCliente)"
s=$(pedir GET /api/productos/2 "$A"); check "Stock descontado" "$((E0-2))" "$(campo existencia)"
s=$(pedir POST /api/facturas "$V" "{\"clienteId\":$C,\"items\":[{\"productoId\":19,\"cantidad\":4}],\"pago\":{\"forma\":\"cuenta_corriente\"}}"); check "Límite de crédito" "LIMITE_CREDITO_EXCEDIDO" "$(codigo)"
s=$(pedir POST /api/clientes/$C/pagos "$V" '{"importe":999999999,"medio":"efectivo"}'); check "Pago mayor que la deuda" "PAGO_SUPERA_DEUDA" "$(codigo)"
s=$(pedir POST /api/clientes/$C/pagos "$V" "{\"importe\":$PR,\"medio\":\"efectivo\"}"); check "Pago parcial" 201 "$s"
check "Saldo después del pago" "$PR" "$(campo saldoCliente)"
s=$(pedir PATCH /api/clientes/$C "$V" '{"activo":false}'); check "Baja con saldo" "SALDO_PENDIENTE" "$(codigo)"
s=$(pedir POST /api/facturas/$F/anulacion "$V" '{"motivo":"x"}'); check "Vendedor anula -> 403" 403 "$s"
s=$(pedir POST /api/facturas/$F/anulacion "$A" '{}'); check "Anulación sin motivo -> 422" 422 "$s"
# La factura F ya se pagó en parte: anularla dejaría saldo a favor (regla 8)
s=$(pedir POST /api/facturas/$F/anulacion "$A" '{"motivo":"Prueba"}'); check "Anular factura pagada en parte" "SALDO_A_FAVOR" "$(codigo)"
s=$(pedir GET /api/clientes/$C "$A"); check "Saldo sin cambios tras el rechazo" "$PR" "$(campo saldo)"
# Otra venta a cuenta, todavía impaga: esa sí se puede anular
s=$(pedir POST /api/facturas "$V" "{\"clienteId\":$C,\"items\":[{\"productoId\":2,\"cantidad\":1}],\"pago\":{\"forma\":\"cuenta_corriente\"}}"); check "Segunda venta en cta cte" 201 "$s"
F2=$(campo id)
s=$(pedir POST /api/facturas/$F2/anulacion "$A" '{"motivo":"Prueba"}'); check "Anulación" 200 "$s"
check "Saldo vuelve a lo adeudado" "$PR" "$(campo saldoCliente)"
s=$(pedir POST /api/facturas/$F2/anulacion "$A" '{"motivo":"Prueba"}'); check "Anular dos veces -> 409" 409 "$s"
s=$(pedir GET /api/productos/2 "$A"); check "Stock reingresado" "$((E0-2))" "$(campo existencia)"
s=$(pedir GET /api/clientes/$C/cuenta "$A"); check "Movimientos de cuenta" 4 "$(campo movimientos.length)"

s=$(pedir GET /api/tablero "$V"); check "Tablero: 30 días" 30 "$(campo ventasDiarias.length)"
s=$(pedir GET "/api/facturas?pageSize=5" "$V"); check "Listado facturas paginado" 5 "$(campo data.length)"
s=$(pedir GET "/api/facturas/proximo-numero" "$V"); check "Próximo número" 200 "$s"
s=$(pedir GET "/api/clientes?conDeuda=true&orden=saldo" "$V"); check "Saldos con totalAdeudado" true "$(campo 'totalAdeudado>0')"
s=$(pedir PATCH /api/usuarios/1 "$A" '{"activo":false}'); check "Admin se desactiva -> 422" "OPERACION_SOBRE_SI_MISMO" "$(codigo)"

# Desactivar al vendedor con la sesión abierta
s=$(pedir PATCH /api/usuarios/2 "$A" '{"activo":false}'); check "Desactivar vendedor" 200 "$s"
s=$(pedir GET /api/auth/me "$V"); check "Vendedor desactivado pierde acceso -> 401" 401 "$s"
s=$(pedir PATCH /api/usuarios/2 "$A" '{"activo":true}'); check "Reactivar vendedor" 200 "$s"
s=$(pedir POST /api/auth/logout "$A"); check "Logout -> 204" 204 "$s"
rm -rf "$D"
