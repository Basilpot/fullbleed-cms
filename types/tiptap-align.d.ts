import "@tiptap/extension-text-align";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: string) => ReturnType;
      unsetTextAlign: () => ReturnType;
      toggleTextAlign: (alignment: string) => ReturnType;
    };
  }
}
