import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram,
  Transaction, sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID, ExtensionType, getMintLen,
  createInitializeMetadataPointerInstruction, createInitializeMintInstruction,
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction, createSetAuthorityInstruction,
  AuthorityType, getMint, getAccount, getTokenMetadata, TYPE_SIZE, LENGTH_SIZE,
} from '@solana/spl-token';
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';

// Deliberately restricted to a single public TEST network. No mainnet mode.
const RPC = 'https://api.devnet.solana.com';
const DECIMALS = 6;
const WHOLE_SUPPLY = 1_000_000_000n;
const RAW_SUPPLY = WHOLE_SUPPLY * 10n ** BigInt(DECIMALS);
const BASE = path.dirname(fileURLToPath(import.meta.url));
const PRIVATE_DIR = path.join(BASE, '.devnet');
const PUBLIC_RESULT = path.join(BASE, 'resultado-publico.json');
const args = process.argv.slice(2);
if (args.length && !(args.length === 1 && args[0] === '--check')) {
  console.error('Este proyecto SOLO admite Devnet. Usa npm start o npm run check.');
  process.exit(1);
}

function metadataFor(payer, mint) {
  return {
    updateAuthority: payer.publicKey, mint: mint.publicKey,
    name: 'Dante (prueba)', symbol: 'DANTE', uri: '', additionalMetadata: [],
  };
}

function buildTransaction(payer, mint, rent) {
  const metadata = metadataFor(payer, mint);
  const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey, newAccountPubkey: mint.publicKey,
      space: mintSpace, lamports: rent, programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(mint.publicKey, null, mint.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, DECIMALS, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID, metadata: mint.publicKey,
      updateAuthority: payer.publicKey, mint: mint.publicKey,
      mintAuthority: payer.publicKey, name: metadata.name, symbol: metadata.symbol, uri: metadata.uri,
    }),
    createAssociatedTokenAccountInstruction(payer.publicKey, ata, payer.publicKey, mint.publicKey, TOKEN_2022_PROGRAM_ID),
    createMintToCheckedInstruction(mint.publicKey, ata, payer.publicKey, RAW_SUPPLY, DECIMALS, [], TOKEN_2022_PROGRAM_ID),
    createSetAuthorityInstruction(mint.publicKey, payer.publicKey, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID),
  );
  return { tx, ata, metadata };
}

function localCheck() {
  const payer = Keypair.generate();
  const mint = Keypair.generate();
  const { tx } = buildTransaction(payer, mint, 5_000_000);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = Keypair.generate().publicKey.toBase58();
  tx.sign(payer, mint);
  const bytes = tx.serialize();
  assert(bytes.length <= 1232, 'La transaccion excede el limite de Solana');
  const decoded = Transaction.from(bytes);
  assert(decoded.verifySignatures(), 'Firmas invalidas');
  const mintInstruction = decoded.instructions[5];
  assert.equal(mintInstruction.data[0], 14); // MintToChecked
  assert.equal(mintInstruction.data.readBigUInt64LE(1), 1_000_000_000_000_000n);
  assert.equal(mintInstruction.data[9], DECIMALS);
  const revokeInstruction = decoded.instructions[6];
  assert.equal(revokeInstruction.data[0], 6); // SetAuthority
  assert.equal(revokeInstruction.data[1], AuthorityType.MintTokens);
  assert.equal(revokeInstruction.data[2], 0); // None: no replacement mint authority
  console.log(`Comprobacion local OK: ${bytes.length} bytes, firmas validas, suministro exacto y revocacion incluida.`);
  console.log('No se han creado claves en disco ni enviado transacciones. Falta la prueba en Devnet.');
}

function loadOrCreateTestKey(filename) {
  const target = path.join(PRIVATE_DIR, filename);
  if (fs.existsSync(target)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(target, 'utf8'))));
  const key = Keypair.generate();
  fs.writeFileSync(target, JSON.stringify(Array.from(key.secretKey)), { mode: 0o600, flag: 'wx' });
  return key;
}

async function verify(connection, payer, mint) {
  const state = await getMint(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const account = await getAccount(connection, ata, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const metadata = await getTokenMetadata(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  assert.equal(state.supply, RAW_SUPPLY, 'Suministro distinto del esperado');
  assert.equal(state.decimals, DECIMALS);
  assert.equal(state.mintAuthority, null, 'La autoridad de emision sigue activa');
  assert.equal(state.freezeAuthority, null, 'Existe autoridad de congelacion');
  assert.equal(account.amount, RAW_SUPPLY, 'El saldo de pruebas no coincide');
  assert(account.owner.equals(payer.publicKey), 'Propietario inesperado');
  assert.equal(metadata?.symbol, 'DANTE');
  assert.equal(metadata?.name, 'Dante (prueba)');
  const result = {
    network: 'devnet', realMoney: false, name: metadata.name, symbol: metadata.symbol,
    mint: mint.publicKey.toBase58(), wallet: payer.publicKey.toBase58(),
    supply: WHOLE_SUPPLY.toString(), decimals: state.decimals,
    mintAuthority: null, freezeAuthority: null,
    metadataEditableBy: payer.publicKey.toBase58(),
    explorer: `https://explorer.solana.com/address/${mint.publicKey.toBase58()}?cluster=devnet`,
    verifiedAt: new Date().toISOString(),
  };
  fs.writeFileSync(PUBLIC_RESULT, JSON.stringify(result, null, 2));
  console.log('\nDANTE CREADA Y VERIFICADA EN DEVNET. Sin valor real.');
  console.log(`Token: ${result.mint}`);
  console.log(`Explorador: ${result.explorer}`);
  console.log('Puedes compartir resultado-publico.json. No compartas la carpeta .devnet.');
}

async function main() {
  if (args[0] === '--check') return localCheck();
  console.log('DANTE - SOLANA DEVNET - SOLO PRUEBAS - COSTE: 0 EUROS');
  fs.mkdirSync(PRIVATE_DIR, { recursive: true, mode: 0o700 });
  const payer = loadOrCreateTestKey('cartera-pruebas.json');
  const mint = loadOrCreateTestKey('mint-pruebas.json');
  console.log(`Cartera nueva y exclusiva para pruebas: ${payer.publicKey.toBase58()}`);
  console.log('No envies SOL reales ni utilices esta cartera para mainnet.');
  const connection = new Connection(RPC, { commitment: 'confirmed', confirmTransactionInitialTimeout: 60_000 });
  // Reusing the saved mint makes retries safe even after a confirmation timeout.
  if (await connection.getAccountInfo(mint.publicKey)) return verify(connection, payer, mint);
  const metadata = metadataFor(payer, mint);
  const space = getMintLen([ExtensionType.MetadataPointer]) + TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const rent = await connection.getMinimumBalanceForRentExemption(space);
  const ataRent = await connection.getMinimumBalanceForRentExemption(170);
  const required = rent + ataRent + 100_000;
  if (await connection.getBalance(payer.publicKey) < required) {
    try {
      const signature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      console.log(`Solicitud de SOL de prueba: ${signature}`);
      for (let i = 0; i < 15; i++) {
        if (await connection.getBalance(payer.publicKey) >= required) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch {
      console.log('La solicitud automatica de SOL de prueba no se ha completado.');
    }
    if (await connection.getBalance(payer.publicKey) < required) {
      console.log('\nAbre https://faucet.solana.com y pide SOL de DEVNET para esta direccion:');
      console.log(payer.publicKey.toBase58());
      console.log('Despues vuelve a abrir INICIAR-WINDOWS.cmd. No compres SOL para esta prueba.');
      process.exitCode = 2;
      return;
    }
  }
  const { tx } = buildTransaction(payer, mint, rent);
  console.log('Creando token, emitiendo el suministro y revocando la emision en una sola transaccion...');
  const signature = await sendAndConfirmTransaction(connection, tx, [payer, mint], { commitment: 'confirmed' });
  console.log(`Transaccion: ${signature}`);
  await verify(connection, payer, mint);
}

main().catch(error => {
  console.error('\nNo se ha podido completar/verificar la prueba:', error.message);
  console.error('Puedes volver a ejecutar sin borrar .devnet: se usa la misma direccion de token.');
  console.error('Si necesitas ayuda, comparte el error o resultado-publico.json; nunca las claves.');
  process.exitCode = 1;
});
