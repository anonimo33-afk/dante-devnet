# DANTE: primer prototipo gratuito

Estado: codigo preparado y comprobado localmente. El token todavia no esta desplegado.
Este paquete SOLO crea un token en Solana Devnet. No contiene un modo de lanzamiento con dinero real.

## Empezar en Windows

1. Instala Node.js 24 LTS para Windows desde https://nodejs.org/en/download (instalador .msi). Si ya tienes Node.js 22 o posterior, puedes usarlo.
2. Extrae todo el ZIP con clic derecho > Extraer todo. No ejecutes el archivo dentro del ZIP.
3. Abre la carpeta extraida y haz doble clic en INICIAR-WINDOWS.cmd. Necesita Internet; descarga las dependencias fijadas por package-lock.json.
4. El programa genera una cartera nueva SOLO PARA PRUEBAS dentro de tu PC, solicita SOL gratuitos de Devnet y crea DANTE. No necesita Phantom ni tu cartera habitual.
5. Si el faucet automatico tiene limite, la consola muestra tu direccion publica. Abre https://faucet.solana.com, selecciona Devnet, pega esa direccion y pide SOL de prueba. Ejecuta otra vez el archivo .cmd.
6. Al terminar abre el enlace del explorador. Debe mostrar cluster Devnet, suministro 1.000.000.000, seis decimales y autoridades de emision y congelacion desactivadas.
7. resultado-publico.json permite revisar el resultado sin compartir claves. Puedes pasarlo para continuar.

En Linux/macOS: npm ci --ignore-scripts y luego npm start.
Comprobacion sin conectarse a la red ni generar archivos de claves: npm run check.

## Lo que hace la prueba

- Nombre: Dante (prueba). Simbolo: DANTE. Ambos son provisionales para el lanzamiento.
- Suministro: 1.000.000.000 tokens, seis decimales. No representa valoracion, dinero ni demanda.
- Programa: Token-2022, con nombre y simbolo guardados en los metadatos del mint.
- Crea el mint, emite todos los tokens a tu cartera DE PRUEBAS y elimina la autoridad de emision en una misma transaccion. No se pueden emitir mas despues; aun se pueden quemar tokens.
- No activa autoridad de congelacion, comisiones de transferencia ni transfer hooks.
- Los metadatos siguen editables por tu cartera de pruebas. No hay logo ni URI externa en esta primera version.
- Reutiliza el mismo mint y la misma cartera al reintentar. No borres .devnet si hubo un error de confirmacion.
- No crea un mercado, liquidez, precio ni una cuenta en una plataforma de lanzamiento.

## Tus claves

La carpeta .devnet contiene claves privadas creadas LOCALMENTE por el programa. No la compartas, no la subas a un repositorio y no uses estas claves para mainnet. El ZIP original no contiene claves. El programa nunca pide tu frase de recuperacion. Devnet no tiene valor monetario y puede reiniciarse.

## Lanzamiento posterior: techo de 50 euros

El despliegue real sera otro token, con otra direccion y cartera. El token de pruebas no se convierte en un token real.
Un lanzamiento mediante una plataforma y un despliegue propio tienen condiciones diferentes; la distribucion real de tokens se decidira segun la via elegida. Tener todos los tokens en esta prueba no implica que vayas a recibirlos gratis en una plataforma.
Pump.fun publica a 08/10/2026 una creacion sin comision de plataforma, pero con comision de red y deposito para cuentas on-chain. Sus tarifas son en SOL y pueden cambiar. Eso no garantiza un mercado activo ni ingresos. No se ha gastado parte de tus 50 euros.
No esta comprobada la disponibilidad de Dante como marca o nombre en plataformas. El nombre y simbolo no identifican un token de forma unica: lo identifica su direccion.

## Fuentes comprobadas el 12/10/2026

- Solana Devnet y RPC: https://solana.com/docs/references/clusters
- Metadatos Token-2022: https://solana.com/docs/tokens/extensions/metadata
- Creacion de mint: https://solana.com/docs/tokens/basics/create-mint
- Tarifas actuales de Pump.fun: https://pump.fun/docs/fees
- Node.js: https://nodejs.org/en/download
