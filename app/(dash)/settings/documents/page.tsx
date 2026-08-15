"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileUploadLabel,
  FormSkeleton,
  RemoveBtn,
  SaveBar,
  Section,
  SettingsHeader,
  useSiteConfig,
  useUpload,
  type SiteConfig,
} from "@/components/site-config-shared";

type DocumentRow = { title: string; key: string; path: string };

function sliceFrom(config: SiteConfig): DocumentRow[] {
  return config.documents;
}

export default function DocumentsPage() {
  const { config, loading, saving, save } = useSiteConfig();
  const { uploadingField, upload } = useUpload();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [synced, setSynced] = useState(false);

  if (config && !synced) {
    setSynced(true);
    setDocuments(sliceFrom(config));
    return <FormSkeleton />;
  }

  if (loading) return <FormSkeleton />;

  const update = (i: number, patch: Partial<DocumentRow>) =>
    setDocuments((docs) => docs.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <>
      <SettingsHeader
        title="Documents"
        description="Downloadable brochures and policy files shown in the storefront documents route."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ documents });
        }}
      >
        <Section title="Documents">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={doc.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Title (e.g. Terms & Conditions)"
                className="w-56"
              />
              <Input
                value={doc.path}
                onChange={(e) => update(i, { path: e.target.value })}
                placeholder="File URL"
              />
              <FileUploadLabel
                fieldPath={`doc-${i}`}
                busy={uploadingField === `doc-${i}`}
                accept=".pdf"
                onUpload={(_, file) => upload(`doc-${i}`, file, (key, value) =>
                  update(i, { path: value }),
                )}
              />
              <RemoveBtn
                onClick={() =>
                  setDocuments((docs) => docs.filter((_, j) => j !== i))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDocuments((docs) => [
                ...docs,
                { title: "", key: "", path: "" },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add document
          </Button>
        </Section>

        <SaveBar
          saving={saving}
          onDiscard={() => config && setDocuments(sliceFrom(config))}
        />
      </form>
    </>
  );
}
