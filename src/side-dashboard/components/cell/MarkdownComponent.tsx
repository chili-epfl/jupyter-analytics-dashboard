import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { IRenderMime } from '@jupyterlab/rendermime';

const MarkdownComponent = (props: {
  markdownContent: string;
  sanitizer: IRenderMime.ISanitizer;
}) => {
  const [sanitizedContent, setSanitizedContent] = useState<string | null>(null);

  useEffect(() => {
    const parseContent = () => {
      // use the marked library to go from (mixed Markdown & HTML) => (HTML)
      const parsedResult = marked.parser(marked.lexer(props.markdownContent));
      // sanitize the content for safe rendering
      setSanitizedContent(props.sanitizer.sanitize(parsedResult));
    };
    parseContent();
  }, [props.markdownContent]);

  return (
    <div className="cell-content-container">
      {sanitizedContent && (
        <div
          className="jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      )}
    </div>
  );
};

export default MarkdownComponent;
