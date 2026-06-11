import React from 'react';
import { Attachment } from '@/types';
import { getAttachmentUrl } from '@/lib/uploads';

interface Props {
  attachments?: Attachment[];
  compact?: boolean;
}

const isImage = (mimeType: string) => mimeType.startsWith('image/');

const AttachmentList: React.FC<Props> = ({ attachments, compact = false }) => {
  if (!attachments?.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-4'}`}>
      {attachments.map((att) => {
        const url = getAttachmentUrl(att.url);
        return (
          <a
            key={att.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border
                       bg-surface hover:bg-surface-hover transition-colors text-sm text-gray-700"
          >
            {isImage(att.mimeType) ? (
              <img
                src={url}
                alt={att.filename}
                className={`object-cover rounded ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
              />
            ) : (
              <span className="text-base">📎</span>
            )}
            <span className="truncate max-w-[160px]">{att.filename}</span>
          </a>
        );
      })}
    </div>
  );
};

export default AttachmentList;
