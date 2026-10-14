// Marca de deploy: la escribe cada compilación (en Heroku, al publicar) para que
// el servidor, al arrancar, sepa que es un deploy nuevo y lo apunte en «Cambios»
// de Aim Education (los reinicios diarios de Heroku no compilan: no cuentan).
// El commit lo da Heroku (SOURCE_VERSION); en local, git.
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

let commit = process.env.SOURCE_VERSION || '';
if (!commit) {
    try { commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { commit = ''; }
}
writeFileSync(new URL('../deploy-marca.json', import.meta.url), JSON.stringify({
    id: randomUUID(),
    fecha: new Date().toISOString(),
    commit: /^[0-9a-f]{7,40}$/i.test(commit) ? commit : null,
}));
console.log('Marca de deploy escrita.');
