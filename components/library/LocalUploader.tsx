import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadLocalItem } from "../../hooks/useLibrary";
import { useSubscription, useUsage } from "../../hooks/useSubscription";
import { LibraryItemType } from "../../types";
import Button from "../ui/Button";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/Card";
import {
  UploadCloud,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const LocalUploader: React.FC = () => {
  const [type, setType] = useState<LibraryItemType>(LibraryItemType.Plugin);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();
  const uploadMutation = useUploadLocalItem();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      uploadMutation.reset();
      const uploadedFile = acceptedFiles[0];
      if (uploadedFile && uploadedFile.name.endsWith(".zip")) {
        setFile(uploadedFile);
      } else {
        setError("Invalid file type. Please upload a .zip file.");
      }
    },
    [uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"] },
    multiple: false,
  });

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate({ file, type });
    }
  };

  const isLimitReached =
    usage && subscription && usage.libraryUsed >= subscription.libraryLimit;

  if (isLimitReached) {
    return (
      <div className="text-center p-8 bg-card border border-border rounded-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-foreground">
          Library Limit Reached
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You have reached your limit of {subscription?.libraryLimit} items.
          Please upgrade your plan to add more.
        </p>
        <Button className="mt-4">Manage Subscription</Button>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload a Plugin or Theme</CardTitle>
        <CardDescription>
          Upload a .zip file to add it to your local library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium">Item Type</label>
          <div className="flex gap-4 mt-2">
            <Button
              onClick={() => setType(LibraryItemType.Plugin)}
              variant={type === "plugin" ? "default" : "outline"}
            >
              Plugin
            </Button>
            <Button
              onClick={() => setType(LibraryItemType.Theme)}
              variant={type === "theme" ? "default" : "outline"}
            >
              Theme
            </Button>
          </div>
        </div>

        {!file ? (
          <div
            {...getRootProps()}
            className={`p-10 border-2 border-dashed rounded-lg cursor-pointer text-center ${isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive
                ? "Drop the file here..."
                : "Drag & drop a .zip file here, or click to select"}
            </p>
          </div>
        ) : (
          <div className="p-4 border rounded-lg flex items-center justify-between bg-secondary">
            <div className="flex-grow">
              <p className="font-medium text-sm text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFile(null);
                uploadMutation.reset();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {uploadMutation.isSuccess && (
          <div className="flex items-center p-3 text-sm text-green-700 bg-green-100 rounded-md">
            <CheckCircle className="w-5 h-5 mr-2" />
            <p>{uploadMutation.data.message}</p>
          </div>
        )}

        {uploadMutation.isError && (
          <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p>{uploadMutation.error.message}</p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploadMutation.isPending}
          className="w-full"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Upload to Library"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LocalUploader;
