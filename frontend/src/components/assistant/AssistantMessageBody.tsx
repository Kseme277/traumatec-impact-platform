import type { ReactNode } from "react";

const BULLET_RE = /^\s*(?:•|[-*])\s+(.+)$/;
const NUMBERED_RE = /^\s*(\d+)\.\s+(.+)$/;

function flushList(
  items: string[],
  ordered: boolean,
  key: string,
  blocks: ReactNode[],
): void {
  if (!items.length) return;
  if (ordered) {
    blocks.push(
      <ol key={key} className="my-1.5 list-decimal space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ol>,
    );
  } else {
    blocks.push(
      <ul key={key} className="my-1.5 list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
  }
  items.length = 0;
}

export default function AssistantMessageBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];
  let blockIndex = 0;

  const flushBullets = () => {
    flushList(bulletItems, false, `ul-${blockIndex++}`, blocks);
  };
  const flushNumbered = () => {
    flushList(numberedItems, true, `ol-${blockIndex++}`, blocks);
  };

  for (const line of lines) {
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flushNumbered();
      bulletItems.push(bullet[1]);
      continue;
    }

    const numbered = line.match(NUMBERED_RE);
    if (numbered) {
      flushBullets();
      numberedItems.push(numbered[2]);
      continue;
    }

    flushBullets();
    flushNumbered();

    if (!line.trim()) {
      if (blocks.length > 0) {
        blocks.push(<div key={`sp-${blockIndex++}`} className="h-2" />);
      }
      continue;
    }

    blocks.push(
      <p key={`p-${blockIndex++}`} className="my-0.5">
        {line}
      </p>,
    );
  }

  flushBullets();
  flushNumbered();

  if (!blocks.length) {
    return <span>{text}</span>;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
