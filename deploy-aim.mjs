// Avisar a Aim Education de un deploy nuevo, para su registro de «Cambios»: al
// arrancar en Heroku, si esta compilación trae su marca (deploy-marca.json, la
// escribe scripts/marca-deploy.mjs al compilar), se apunta en la base
// compartida (aim_ajustes 'deploy_app:<id>'). Aim Education la recoge, hace la
// entrada con los commits de este repositorio y resuelve los tickets de esta
// app que esperaban el deploy. Un reinicio no compila: misma marca, no se
// repite. Si falla, no pasa nada: solo se queda sin apuntar.
import { readFileSync } from 'fs';
import path from 'path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// consulta(sql, params): la de la base de la app (pool.query o similar).
export async function apuntarDeploy({ app, consulta, raiz }) {
    if (!/^web/.test(process.env.DYNO || '')) return;   // solo en Heroku; en local, nunca
    let m;
    try { m = JSON.parse(readFileSync(path.join(raiz, 'deploy-marca.json'), 'utf8')); } catch { return; }
    if (!UUID.test(String(m?.id || ''))) return;
    try {
        await consulta(
            `INSERT INTO aim_ajustes (clave, valor, actualizado_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (clave) DO NOTHING`,
            [`deploy_app:${m.id}`, JSON.stringify({ app, id: m.id, fecha: m.fecha || null, commit: m.commit || null, publicado: new Date().toISOString(), procesado: false })]);
    } catch (e) {
        console.warn('[deploy] no se ha podido apuntar en Aim Education:', e.message);
    }
}
