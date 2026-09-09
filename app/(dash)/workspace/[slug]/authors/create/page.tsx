"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MediaPicker } from "@/components/media-picker";
import { getFullImageUrl } from "@/lib/getFullImageUrl";

type FormValues = {
  username: string;
  name: string;
  email: string;
  password: string;
  bio: string;
};

export default function AddOrEditAuthor() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = usePathname().split("/")[2];

  const authorId = searchParams.get("authorId");

  const isEdit = !!authorId;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const fetchAuthor = async () => {
      try {
        const res = await fetch(
          `/api/authors/${authorId}`,
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to load author");

        setValue("username", data.username);
        setValue("name", data.name);
        setValue("email", data.email);
        setValue("bio", data.bio);

        if (data.image) {
          setPreview(data.image);
          setUploadedImageUrl(data.image);
        }
      } catch (err) {
        console.error(err);
        setMessage("Error loading author data.");
      }
    };

    fetchAuthor();
  }, [isEdit, authorId, setValue]);

  const onSubmit = async (data: FormValues) => {
    setMessage("");

    try {
      const imageUrl = uploadedImageUrl || "";

      const payload = {
        username: data.username,
        name: data.name,
        email: data.email,
        password: data.password || undefined,
        bio: data.bio,
        image: imageUrl,
      };

      const url = isEdit
        ? `/api/authors/update/${authorId}`
        : `/api/authors/create`;

      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.message || "Error submitting form");
        return;
      }

      router.push(`/workspace/${slug}/authors`);
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong");
    }
  };

  return (
    <div className="mx-auto px-4 w-full">
      <h1 className="text-3xl font-semibold mb-8">
        {isEdit ? "Edit Author" : "Add Author"}
      </h1>

      {message && <p className="mb-6 text-sm text-red-600">{message}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Two-column inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Username</label>
            <input
              {...register("username")}
              className="p-3 border rounded focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Username"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium">Name</label>
            <input
              {...register("name")}
              className="p-3 border rounded focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Full name"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium">Email</label>
          <input
            {...register("email", { required: "Email is required" })}
            type="email"
            className="p-3 border rounded focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Email address"
          />
          {errors.email && (
            <span className="text-sm text-red-600">{errors.email.message}</span>
          )}
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1">
            <label className="font-medium">Password</label>
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Minimum 8 characters" },
              })}
              type="password"
              className="p-3 border rounded focus:outline-none focus:ring focus:ring-blue-200"
              placeholder="Password"
            />
            {errors.password && (
              <span className="text-sm text-red-600">
                {errors.password.message}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="font-medium">Bio</label>
          <textarea
            {...register("bio")}
            className="p-3 border rounded min-h-[120px] focus:outline-none focus:ring focus:ring-blue-200"
            placeholder="Short bio"
          />
        </div>

        {/* Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="font-medium">Profile Image</label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setPickerOpen(true)}
            >
              Browse
            </Button>

            {preview && (
              <img
                src={getFullImageUrl(preview)}
                alt="Preview"
                className="w-36 h-36 object-cover rounded-lg border"
              />
            )}
          </div>
        </div>

        <div className="btn-group flex gap-4 items-center">
          <Link href={`/workspace/${slug}/authors`}>
            <Button variant={"secondary"} size={"lg"}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} size={"lg"}>
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Add Author"}
          </Button>
        </div>
      </form>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(media) => {
          setUploadedImageUrl(media.url);
          setPreview(media.url);
        }}
      />
    </div>
  );
}
