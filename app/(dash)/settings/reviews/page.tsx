"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Field,
  FormSkeleton,
  SaveBar,
  Section,
  SettingsHeader,
  useSiteConfig,
  type SiteConfig,
} from "@/components/site-config-shared";

type ReviewRow = { count: number; rating: number; link: string };

function sliceFrom(config: SiteConfig) {
  return {
    googleReview: config.reviews.googleReview,
    tripadvisor: config.reviews.tripadvisor,
    gmb: config.gmb,
  };
}

export default function ReviewsPage() {
  const { config, loading, saving, save } = useSiteConfig();
  const [values, setValues] = useState<{
    googleReview: ReviewRow;
    tripadvisor: ReviewRow;
    gmb: { link: string; location: string };
  }>({
    googleReview: { count: 0, rating: 0, link: "" },
    tripadvisor: { count: 0, rating: 0, link: "" },
    gmb: { link: "", location: "" },
  });
  const [synced, setSynced] = useState(false);

  if (config && !synced) {
    setSynced(true);
    setValues(sliceFrom(config));
    return <FormSkeleton />;
  }

  if (loading) return <FormSkeleton />;

  const setReview = (key: "googleReview" | "tripadvisor", patch: Partial<ReviewRow>) =>
    setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }));

  return (
    <>
      <SettingsHeader
        title="Reviews"
        description="Review counts and links shown as social proof on the storefront."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(values);
        }}
      >
        {(["googleReview", "tripadvisor"] as const).map((source) => (
          <Section key={source} title={source === "googleReview" ? "Google reviews" : "Tripadvisor reviews"}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Review count">
                <Input
                  type="number"
                  min={0}
                  value={values[source].count}
                  onChange={(e) =>
                    setReview(source, { count: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Average rating">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={values[source].rating}
                  onChange={(e) =>
                    setReview(source, { rating: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="Review page link">
              <Input
                value={values[source].link}
                onChange={(e) =>
                  setReview(source, { link: e.target.value })
                }
                placeholder="https://google.com/maps/..."
              />
            </Field>
          </Section>
        ))}

        <Section title="Google Maps listing">
          <Field label="Listing link">
            <Input
              value={values.gmb.link}
              onChange={(e) =>
                setValues((v) => ({ ...v, gmb: { ...v.gmb, link: e.target.value } }))
              }
              placeholder="https://g.page/..."
            />
          </Field>
          <Field label="Location name">
            <Input
              value={values.gmb.location}
              onChange={(e) =>
                setValues((v) => ({ ...v, gmb: { ...v.gmb, location: e.target.value } }))
              }
              placeholder="Thamel, Kathmandu"
            />
          </Field>
        </Section>

        <SaveBar
          saving={saving}
          onDiscard={() => config && setValues(sliceFrom(config))}
        />
      </form>
    </>
  );
}
