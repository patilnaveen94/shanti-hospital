import { CheckCheck, Info, MessageCircleOff } from 'lucide-react';

import { HOSPITAL } from '../../config/hospital';
import { renderTemplate } from '../../utils/messageTemplates';

/**
 * WhatsApp-style rendering of a template with its variables filled in.
 *
 * Deliberately styled like a chat bubble: staff are deciding whether the
 * wording is right for a patient, and a plain textarea makes that hard to judge.
 * Line breaks are preserved because they are load-bearing in these templates.
 */
export default function MessagePreview({ body, params, disabled = false, note }) {
  const rendered = renderTemplate(body, params);
  const unfilled = /\{\{\d+\}\}/.test(rendered);

  return (
    <div>
      {/* Chat surface */}
      <div className="rounded-2xl bg-[#e5ddd5] p-3 sm:p-4">
        <div className="ml-auto max-w-[22rem] rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 shadow-sm">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
            {rendered || 'Nothing to preview.'}
          </p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-slate-500">
            {new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            <CheckCheck className="h-3 w-3 text-sky-600" aria-hidden="true" />
          </p>
        </div>

        <p className="mt-2 text-center text-[10.5px] font-medium text-slate-500">
          Sent from {HOSPITAL.name}, {HOSPITAL.city}
        </p>
      </div>

      {unfilled && (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Some placeholders were not filled. Check the numbering matches the variable list.
        </p>
      )}

      {disabled && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[12px] leading-snug text-slate-600">
          <MessageCircleOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This message is currently switched off, so nothing will be sent.
        </p>
      )}

      {note && <p className="mt-2 text-[12px] leading-snug text-slate-500">{note}</p>}
    </div>
  );
}
