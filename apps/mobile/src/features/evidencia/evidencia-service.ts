import { MESSAGES } from '@concreto/shared';

import { supabase } from '../../services/supabase';

/** Evidence photo moment (US11): before / after the rupture. */
export type EvidenciaTipo = 'antes' | 'depois';

/** Private Storage bucket for internal evidence photos (SPEC §4.5). */
const BUCKET = 'evidencias';

export interface UploadEvidenciaParams {
  rupturaId: string;
  tipo: EvidenciaTipo;
  /** Local uri of the already-watermarked PNG. */
  uri: string;
}

/** [PREMISSA] Reads the local watermarked PNG as bytes for the Storage upload. */
async function readBytes(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

/**
 * Uploads a watermarked evidence photo straight to the private `evidencias`
 * bucket and records it in `evidencia_fotos` (F-S006-5). Any failure (upload or
 * insert) surfaces the exact copy "Falha ao enviar a foto. Tente novamente." so
 * the caller can keep the local photo and offer a retry (US11-CA3). Returns the
 * stored object path on success.
 */
export async function uploadEvidencia({
  rupturaId,
  tipo,
  uri,
}: UploadEvidenciaParams): Promise<string> {
  const objectPath = `${rupturaId}/${tipo}-${Date.now()}.png`;
  try {
    const bytes = await readBytes(uri);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: 'image/png', upsert: false });
    if (uploadError) {
      throw uploadError;
    }
    const { error: insertError } = await supabase
      .from('evidencia_fotos')
      .insert({ ruptura_id: rupturaId, tipo, storage_path: objectPath });
    if (insertError) {
      throw insertError;
    }
    return objectPath;
  } catch {
    throw new Error(MESSAGES.feature.evidenciaFalhaUpload);
  }
}
