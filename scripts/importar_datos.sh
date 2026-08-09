#!/bin/bash
# Importa data/transcripcion_junio_2025.xlsx (97 beneficiarios del PDF de
# junio 2025) directamente a la app ya desplegada, vía el panel admin.
# La contraseña se pide de forma interactiva y no queda guardada en ningún
# lado ni pasa por el historial de este script.
#
# Uso:
#   ./scripts/importar_datos.sh https://tu-app.onrender.com
#
# Debe correrse desde la raíz del proyecto (donde está la carpeta data/).

set -e

if [ -z "$1" ]; then
  echo "Uso: ./scripts/importar_datos.sh https://tu-app.onrender.com"
  exit 1
fi
URL="$1"
ARCHIVO="data/transcripcion_junio_2025.xlsx"

if [ ! -f "$ARCHIVO" ]; then
  echo "No se encontró $ARCHIVO. Corre este script desde la raíz del proyecto."
  exit 1
fi

read -p "Usuario admin: " USUARIO
read -s -p "Contraseña admin: " PASSWORD
echo

COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

echo "Iniciando sesión en $URL ... (puede tardar hasta 1 min si la app estaba dormida)"
LOGIN_CODE=$(curl -s -c "$COOKIES" -o /dev/null -w "%{http_code}" --max-time 90 \
  -X POST "$URL/login" --data-urlencode "usuario=$USUARIO" --data-urlencode "password=$PASSWORD")

if [ "$LOGIN_CODE" != "302" ]; then
  echo "No se pudo iniciar sesión (código $LOGIN_CODE). Revisa usuario/contraseña."
  exit 1
fi
echo "Sesión iniciada."

echo "Subiendo $ARCHIVO ..."
RESP=$(mktemp)
trap 'rm -f "$COOKIES" "$RESP"' EXIT
IMPORT_CODE=$(curl -s -b "$COOKIES" -o "$RESP" -w "%{http_code}" --max-time 120 \
  -X POST "$URL/admin/importar" -F "archivo=@$ARCHIVO")

if [ "$IMPORT_CODE" != "200" ]; then
  echo "Error al importar (código $IMPORT_CODE). Detalle:"
  grep -oE 'class="alerta error">[^<]*' "$RESP" || cat "$RESP"
  exit 1
fi

echo "Listo. Resultado:"
grep -oE '[0-9]+ fila\(s\) procesada\(s\)[^<]*' "$RESP" || echo "(revisa manualmente en $URL/admin)"
grep -oE 'Fila [0-9]+: [^<]*' "$RESP" || true
