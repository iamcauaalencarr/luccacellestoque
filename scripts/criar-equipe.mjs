/**
 * Script: criar-equipe.mjs
 * Cria os usuários da equipe no Firebase Auth e Firestore,
 * e gera links de primeiro acesso (definição de senha) para cada um.
 *
 * USO:
 *   node scripts/criar-equipe.mjs <caminho-para-serviceAccountKey.json>
 *
 * Ex:
 *   node scripts/criar-equipe.mjs ./serviceAccountKey.json
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// ── Configuração ──────────────────────────────────────────────────────────────

const INTERNAL_AUTH_DOMAIN = 'luccacell.app';
const FIRESTORE_DB_ID = 'ai-studio-aa30bf6c-23a6-4314-b3f9-7df7491d5045';

// Equipe a criar
const EQUIPE = [
  { displayName: 'Harnilson', username: 'harnilson', role: 'admin' },
  { displayName: 'Cauã',      username: 'caua',      role: 'admin' },
  { displayName: 'Kaylane',   username: 'kaylane',   role: 'vendedor' },
  { displayName: 'Lucca',     username: 'lucca',     role: 'vendedor' },
  { displayName: 'Israel',    username: 'israel',    role: 'vendedor' },
];

// Criado por (admin que está rodando o script)
const CRIADO_POR = {
  uid: 'script-admin',
  displayName: 'Administrador',
  role: 'admin',
};

// ── Inicialização ─────────────────────────────────────────────────────────────

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('\n❌ Informe o caminho para o serviceAccountKey.json:');
  console.error('   node scripts/criar-equipe.mjs ./serviceAccountKey.json\n');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch (e) {
  console.error(`\n❌ Não foi possível ler o arquivo: ${keyPath}\n`, e.message);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore(FIRESTORE_DB_ID);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toEmail(username) {
  return `${username.toLowerCase()}@${INTERNAL_AUTH_DOMAIN}`;
}

async function getOrCreateUser(displayName, username, role) {
  const email = toEmail(username);
  let uid;
  let isNew = false;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  ℹ️  Já existe: ${email} (uid: ${uid})`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;

    // Cria com senha temporária aleatória (o link vai substituí-la)
    const tempPassword = Math.random().toString(36).slice(2) + 'Aa1!';
    const created = await auth.createUser({
      email,
      password: tempPassword,
      displayName,
    });
    uid = created.uid;
    isNew = true;
    console.log(`  ✅ Criado: ${email} (uid: ${uid})`);
  }

  // Garante o documento no Firestore (users + staffDirectory)
  const now = Timestamp.now();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const batch = db.batch();

    batch.set(userRef, {
      uid,
      displayName,
      username,
      email,
      role,
      active: true,
      createdAt: now,
      createdBy: CRIADO_POR.uid,
      usernameConfirmed: true,
    });

    const dirRef = db.collection('staffDirectory').doc(uid);
    batch.set(dirRef, {
      uid,
      displayName,
      username,
      role,
      active: true,
      createdAt: now,
    });

    // Audit log
    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
      actorUid: CRIADO_POR.uid,
      actorName: CRIADO_POR.displayName,
      actorRole: CRIADO_POR.role,
      action: `Criou acesso para ${displayName} (@${username}) como ${role === 'admin' ? 'Administrador' : 'Vendedor'} (via script)`,
      timestamp: now,
    });

    await batch.commit();
    console.log(`  📄 Firestore atualizado`);
  } else {
    console.log(`  ℹ️  Já existe no Firestore`);
  }

  return { uid, email, isNew };
}

async function gerarLinkPrimeiroAcesso(email) {
  // Sem actionCodeSettings para evitar restrição de domínio
  const link = await auth.generatePasswordResetLink(email);
  return link;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n🚀 Lucca Cell — Criação de Equipe\n');
console.log('='.repeat(60));

const resultados = [];

for (const membro of EQUIPE) {
  console.log(`\n👤 ${membro.displayName} (@${membro.username}) — ${membro.role}`);

  try {
    const { uid, email } = await getOrCreateUser(
      membro.displayName,
      membro.username,
      membro.role
    );

    const link = await gerarLinkPrimeiroAcesso(email);
    resultados.push({ ...membro, email, uid, link });
    console.log(`  🔗 Link gerado com sucesso`);
  } catch (err) {
    console.error(`  ❌ Erro:`, err.message);
    resultados.push({ ...membro, erro: err.message });
  }
}

// ── Resultado Final ───────────────────────────────────────────────────────────

console.log('\n\n' + '='.repeat(60));
console.log('📋 LINKS DE PRIMEIRO ACESSO — COMPARTILHE COM CADA UM:\n');

for (const r of resultados) {
  if (r.erro) {
    console.log(`❌ ${r.displayName}: ERRO — ${r.erro}`);
    continue;
  }
  console.log(`👤 ${r.displayName} (${r.role === 'admin' ? 'Administrador' : 'Vendedor'})`);
  console.log(`   Usuário de login: ${r.username}`);
  console.log(`   Link para definir senha:`);
  console.log(`   ${r.link}`);
  console.log();
}

console.log('='.repeat(60));
console.log('⚠️  Atenção: cada link é de uso único e expira em 1 hora.');
console.log('   Após definir a senha, o usuário faz login com o USUÁRIO (não email).\n');
