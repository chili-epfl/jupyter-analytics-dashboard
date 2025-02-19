import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { INotebookModel } from '@jupyterlab/notebook';
import { ICellModel } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';

// class that computes values that are impacted by API breaking changes between the multiple JupyterLab versions
// the jupyterVersion is set when the extension plugin is activated and is provided here so all static methods can read it
export class CompatibilityManager {
  private static _jupyterVersion: number | null = null;
  private static _editorDefaultLanguages: any = undefined;

  // attributes used to hold the value of the async imports done to perform imports specific to some jupyterlab versions
  private static _EditorView: any = undefined;
  private static _jupyterTheme: any = undefined;

  static async setJupyterVersion(version: number): Promise<void> {
    CompatibilityManager._jupyterVersion = version;

    await CompatibilityManager._setEditorLanguageRegistry();
    await CompatibilityManager._asyncImports();
  }

  private static async _setEditorLanguageRegistry() {
    // EditorLanguageRegistry not defined in JupyterLab 3 so only use the class once it is safe to do so
    if (CompatibilityManager._jupyterVersion === 4) {
      // lazy loading module since it's not available in JupyterLab 3
      const { StreamLanguage } = await import('@codemirror/language');
      const { EditorLanguageRegistry, parseMathIPython } = await import(
        '@jupyterlab/codemirror'
      );

      const editorDefaultLanguages = new EditorLanguageRegistry();

      // register all the JupyterLab default languages
      EditorLanguageRegistry.getDefaultLanguages().forEach(language => {
        editorDefaultLanguages.addLanguage(language);
      });

      editorDefaultLanguages.addLanguage({
        name: 'ipythongfm',
        mime: 'text/x-ipythongfm',
        load: async () => {
          const [m, tex] = await Promise.all([
            import('@codemirror/lang-markdown'),
            import('@codemirror/legacy-modes/mode/stex')
          ]);
          return m.markdown({
            base: m.markdownLanguage,
            codeLanguages: (info: string) =>
              editorDefaultLanguages.findBest(info) as any,
            extensions: [
              parseMathIPython(StreamLanguage.define(tex.stexMath).parser)
            ]
          });
        }
      });

      CompatibilityManager._editorDefaultLanguages = editorDefaultLanguages;
    }
  }

  private static async _asyncImports() {
    if (CompatibilityManager._jupyterVersion === 4) {
      const { EditorView } = await import('@codemirror/view');
      this._EditorView = EditorView;
      const { jupyterTheme } = await import('@jupyterlab/codemirror');
      this._jupyterTheme = jupyterTheme;
    }
  }

  static checkJupyterVersionSet(): void {
    if (CompatibilityManager._jupyterVersion === null) {
      throw new Error(
        'JupyterLab version is not set in CompatibilityManager before trying to access it.'
      );
    }
  }

  static getMetadataComp = (
    model: INotebookModel | ICellModel | null | undefined,
    key: string
  ): any => {
    CompatibilityManager.checkJupyterVersionSet();

    if (CompatibilityManager._jupyterVersion === 4) {
      return (model as any)?.getMetadata(key);
    } else {
      return (model?.metadata as any)?.get(key);
    }
  };

  static setMetadataComp = (
    model: INotebookModel | ICellModel | null | undefined,
    key: string,
    value: any
  ): void => {
    CompatibilityManager.checkJupyterVersionSet();

    if (CompatibilityManager._jupyterVersion === 4) {
      (model as any)?.setMetadata(key, value);
    } else {
      (model?.metadata as any)?.set(key, value);
    }
  };

  static deleteMetadataComp = (
    model: INotebookModel | ICellModel | null | undefined,
    key: string
  ): any => {
    CompatibilityManager.checkJupyterVersionSet();

    if (CompatibilityManager._jupyterVersion === 4) {
      return (model as any)?.deleteMetadata(key);
    } else {
      return (model?.metadata as any)?.delete(key);
    }
  };

  static getFileComp = (factory: IFileBrowserFactory): any => {
    CompatibilityManager.checkJupyterVersionSet();

    const file = factory.tracker.currentWidget?.selectedItems().next();
    if (CompatibilityManager._jupyterVersion === 4) {
      return file?.value;
    } else {
      return file;
    }
  };

  // works for JupyterLab 3 and 4
  static getCellsArrComp = (cells: any) => {
    CompatibilityManager.checkJupyterVersionSet();
    if (cells) {
      return Array.from({ length: cells.length }, (_, index) =>
        cells.get(index)
      );
    } else {
      return null;
    }
  };

  static getCodeMirrorOptionsComp = () => {
    CompatibilityManager.checkJupyterVersionSet();
    if (CompatibilityManager._jupyterVersion === 4) {
      // lazy loading module since it's not available in JupyterLab 3
      return {
        extensions: [
          this._jupyterTheme,
          this._EditorView.lineWrapping,
          this._EditorView.editable.of(false)
        ],
        languages: CompatibilityManager._editorDefaultLanguages
      };
    } else {
      return {
        config: {
          readOnly: true
        }
      };
    }
  };

  static observeEditorVisibility(
    editor: CodeMirrorEditor
  ): IntersectionObserver | null {
    if (CompatibilityManager._jupyterVersion === 3) {
      const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            // when the editor becomes visible, trigger refresh
            (editor as any).refresh();
          }
        },
        {
          root: null, // use the viewport as the root
          threshold: 0.5 // trigger when 50% of the element is visible
        }
      );

      return observer;
    }

    return null;
  }

  static getNextWidgetValueComp = (widgetIterator: any): any => {
    CompatibilityManager.checkJupyterVersionSet();

    if (CompatibilityManager._jupyterVersion === 4) {
      return widgetIterator.next()?.value;
    } else {
      return widgetIterator.next();
    }
  };
}
