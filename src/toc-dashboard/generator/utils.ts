import { INotebookHeading } from '../../utils/headings';
import { Cell } from '@jupyterlab/cells';
import { IRenderMime } from '@jupyterlab/rendermime';

export function getLastHeadingLevel(headings: INotebookHeading[]): number {
  if (headings.length > 0) {
    let loc = headings.length - 1;
    while (loc >= 0) {
      if (headings[loc].type === 'header') {
        return headings[loc].level;
      }
      loc -= 1;
    }
  }
  return 0;
}

type lineClickFactory = (line: number) => () => void;
type elementClickFactory = (el: Element) => () => void;

export const MARKDOWN_HEADING_COLLAPSED = 'jp-MarkdownHeadingCollapsed';
export const UNSYNC_MARKDOWN_HEADING_COLLAPSED = 'dashboard-toc-hr-collapsed';

// Code heading

export function getCodeCellHeading(
  text: string,
  onClick: lineClickFactory,
  executionCount: string,
  lastLevel: number,
  cellRef: Cell,
  index: number
): INotebookHeading {
  const headings: INotebookHeading[] = [];
  if (text) {
    const lines = text.split('\n');
    const len = Math.min(lines.length, 3);
    let str = '';
    let i = 0;
    for (; i < len - 1; i++) {
      str += lines[i] + '\n';
    }
    str += lines[i];
    headings.push({
      text: str,
      level: lastLevel + 1,
      onClick: onClick(0),
      type: 'code',
      prompt: executionCount,
      cellRef: cellRef,
      hasChild: false,
      index: index
    });
  }
  return headings[0];
}

export function appendHeading(
  headings: INotebookHeading[],
  heading: INotebookHeading,
  prev: INotebookHeading | null,
  collapseLevel: number
): [INotebookHeading[], INotebookHeading | null] {
  if (heading && heading.text) {
    // determine whether this heading is a child of a "header" notebook heading...
    if (prev && prev.type === 'header') {
      for (let j = headings.length - 1; j >= 0; j--) {
        if (headings[j] === prev) {
          headings[j].hasChild = true;
        }
      }
    }
    if (collapseLevel < 0) {
      headings.push(heading);
    }
    prev = heading;
  }
  return [headings, prev];
}

interface INumberingDictionary {
  [level: number]: number;
}

export const sanitizerOptions = {
  allowedTags: [
    'p',
    'blockquote',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'code',
    'br',
    'div',
    'span',
    'pre',
    'del'
  ],
  allowedAttributes: {
    // Allow "class" attribute for <code> tags.
    code: ['class'],
    // Allow "class" attribute for <span> tags.
    span: ['class'],
    // Allow "class" attribute for <div> tags.
    div: ['class'],
    // Allow "class" attribute for <p> tags.
    p: ['class'],
    // Allow "class" attribute for <pre> tags.
    pre: ['class']
  }
};

export function getRenderedHTMLHeadings(
  node: HTMLElement,
  onClick: elementClickFactory,
  sanitizer: IRenderMime.ISanitizer,
  dict: INumberingDictionary,
  lastLevel: number,
  numbering = false,
  numberingH1 = true,
  cellRef: Cell,
  index: number
): INotebookHeading[] {
  const nodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
  let currentLevel = lastLevel;

  const headings: INotebookHeading[] = [];
  for (const el of nodes) {
    if (el.nodeName.toLowerCase() === 'p') {
      if (el.innerHTML) {
        const html = sanitizer.sanitize(el.innerHTML, sanitizerOptions);
        headings.push({
          level: currentLevel + 1,
          html: html.replace('¶', ''),
          text: el.textContent ? el.textContent : '',
          onClick: onClick(el),
          type: 'markdown',
          cellRef: cellRef,
          hasChild: false,
          index: index
        });
      }
      continue;
    }
    if (el.getElementsByClassName('numbering-entry').length > 0) {
      el.removeChild(el.getElementsByClassName('numbering-entry')[0]);
    }
    let html = sanitizer.sanitize(el.innerHTML, sanitizerOptions);
    html = html.replace('¶', '');

    let level = parseInt(el.tagName[1], 10);
    if (!numberingH1) {
      level -= 1;
    }
    currentLevel = level;
    const nstr = generateNumbering(dict, level);
    if (numbering) {
      const nhtml = document.createElement('span');
      nhtml.classList.add('numbering-entry');
      nhtml.textContent = nstr ?? '';
      el.insertBefore(nhtml, el.firstChild);
    }
    headings.push({
      level: level,
      text: el.textContent ? el.textContent : '',
      numbering: nstr,
      html: html,
      onClick: onClick(el),
      type: 'header',
      cellRef: cellRef,
      hasChild: false,
      index: index
    });
  }
  return headings;
}

function appendCollapsibleHeading(
  headings: INotebookHeading[],
  heading: INotebookHeading,
  prev: INotebookHeading | null,
  collapseLevel: number,
  collapsed: boolean
): [INotebookHeading[], INotebookHeading | null, number] {
  const len = headings.length;
  // if the previous heading is a higher level heading, update the heading to note that it has a child heading...
  if (prev && prev.type === 'header' && prev.level < heading.level) {
    for (let j = len - 1; j >= 0; j--) {
      if (headings[j] === prev) {
        headings[j].hasChild = true;
      }
    }
  }
  // if the collapse level doesn't include the heading, or, if there is no collapsing, add to headings and adjust the collapse level...
  if (collapseLevel >= heading.level || collapseLevel < 0) {
    headings.push(heading);
    collapseLevel = collapsed ? heading.level : -1;
  }
  prev = heading;

  return [headings, prev, collapseLevel];
}

export function appendMarkdownHeading(
  heading: INotebookHeading | undefined,
  headings: INotebookHeading[],
  prev: INotebookHeading | null,
  collapseLevel: number,
  collapsed: boolean,
  showMarkdown: boolean
): [INotebookHeading[], INotebookHeading | null, number] {
  if (heading && heading.type === 'markdown' && showMarkdown) {
    // Append a Markdown preview heading:
    [headings, prev] = appendHeading(headings, heading, prev, collapseLevel);
  } else if (heading && heading.type === 'header') {
    [headings, prev, collapseLevel] = appendCollapsibleHeading(
      headings,
      heading,
      prev,
      collapseLevel,
      collapsed
    );
  }
  return [headings, prev, collapseLevel];
}

// Markdown heading

const MAX_HEADING_LEVEL = 6;

function update(dict: any, level: number) {
  for (let l = level + 1; l <= MAX_HEADING_LEVEL; l++) {
    if (dict[l] !== void 0) {
      dict[l] = void 0;
    }
  }
  if (dict[level] === void 0) {
    dict[level] = 1;
  } else {
    dict[level] += 1;
  }
  return dict;
}

function generateNumbering(
  dict: INumberingDictionary,
  level: number
): string | undefined {
  if (dict === null) {
    return;
  }
  let numbering = '';
  dict = update(dict, level);
  if (level >= 1) {
    for (let j = 1; j <= level; j++) {
      numbering += (dict[j] === void 0 ? '0' : dict[j]) + '.';
    }
    numbering += ' ';
  }
  return numbering;
}

interface IParsedHeading {
  text: string;

  level: number;

  type: 'html' | 'markdown' | 'markdown-alt';
}

function parseHeading(str: string): IParsedHeading | null {
  const lines = str.split('\n');

  // Case: Markdown heading
  let match = lines[0].match(/^([#]{1,6}) (.*)/);
  if (match) {
    return {
      text: match[2].replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
      level: match[1].length,
      type: 'markdown'
    };
  }
  // Case: Markdown heading (alternative style)
  if (lines.length > 1) {
    match = lines[1].match(/^ {0,3}([=]{2,}|[-]{2,})\s*$/);
    if (match) {
      return {
        text: lines[0].replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
        level: match[1][0] === '=' ? 1 : 2,
        type: 'markdown-alt'
      };
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = lines[0].match(/<h([1-6]).*>(.*)<\/h\1>/i);
  if (match) {
    return {
      text: match[2],
      level: parseInt(match[1], 10),
      type: 'html'
    };
  }
  return null;
}

export function getMarkdownHeadings(
  text: string,
  onClick: lineClickFactory,
  dict: any,
  lastLevel: number,
  cellRef: Cell,
  index: number
): INotebookHeading[] {
  const callback = onClick(0);
  const headings: INotebookHeading[] = [];
  let currentLevel = lastLevel;

  for (const line of text.split('\n')) {
    if (line) {
      const heading = parseHeading(line);
      if (heading) {
        headings.push({
          text: heading.text,
          level: heading.level,
          numbering: generateNumbering(dict, heading.level),
          onClick: callback,
          type: 'header',
          cellRef: cellRef,
          hasChild: false,
          index
        });
        currentLevel = heading.level;
      } else {
        headings.push({
          text: line,
          level: currentLevel + 1,
          onClick: callback,
          type: 'markdown',
          cellRef: cellRef,
          hasChild: false,
          index
        });
      }
    }
  }
  return headings;
}
