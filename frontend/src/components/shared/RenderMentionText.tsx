import React from 'react';

interface Props {
  content: string;
}

const RenderMentionText: React.FC<Props> = ({ content }) => {
  if (!content) return null;

  // react-mentions uses the format @[Display Name](id)
  const parts = content.split(/(@\[.+?\]\(.+?\))/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/@\[(.+?)\]\((.+?)\)/);
        if (match) {
          // match[1] is Display Name, match[2] is id
          return (
            <span key={index} className="text-brand-600 font-semibold bg-brand-50 px-1 rounded">
              @{match[1]}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

export default RenderMentionText;
